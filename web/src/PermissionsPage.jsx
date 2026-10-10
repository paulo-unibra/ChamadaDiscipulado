import { useMemo, useState } from 'react';
import { Check, CopyPlus, RotateCcw, Save, ShieldCheck, Trash2, UsersRound } from 'lucide-react';
import './PermissionsPage.css';

const features = [
  { group: 'Geral', id: 'inicio', label: 'Visão geral', actions: ['view'] },
  { group: 'Membros', id: 'novos-convertidos', label: 'Novos convertidos', actions: ['view', 'create', 'edit', 'delete', 'export'] },
  { group: 'Discipulado', id: 'turmas', label: 'Turmas', actions: ['view', 'create', 'edit', 'delete'] },
  { group: 'Discipulado', id: 'alunos', label: 'Participantes', actions: ['view', 'create', 'edit', 'delete'] },
  { group: 'Discipulado', id: 'aulas', label: 'Aulas do discipulado', actions: ['view'] },
  { group: 'Discipulado', id: 'professores', label: 'Professores', actions: ['view', 'create', 'edit', 'delete'] },
  { group: 'Discipulado', id: 'escala', label: 'Escala de aulas', actions: ['view', 'edit', 'export', 'generate'] },
  { group: 'Operacional', id: 'chamadas', label: 'Chamadas', actions: ['view', 'create', 'edit', 'delete'] },
  { group: 'Relatórios', id: 'relatorios', label: 'Relatórios gerais', actions: ['view', 'export'] },
  { group: 'Relatórios', id: 'frequencia', label: 'Relatório de frequência', actions: ['view', 'export'] },
  { group: 'Configurações', id: 'congregacao', label: 'Dados da congregação', actions: ['view', 'edit'] },
  { group: 'Configurações', id: 'integracoes', label: 'Integrações', actions: ['view', 'edit'] },
  { group: 'Configurações', id: 'permissoes', label: 'Permissões', actions: ['view', 'edit'] },
];

const actionLabels = {
  view: 'Visualizar',
  create: 'Criar',
  edit: 'Editar',
  delete: 'Excluir',
  export: 'Exportar',
  generate: 'Gerar',
};

function createPermissionMap(allowed = []) {
  return Object.fromEntries(features.map((feature) => [
    feature.id,
    Object.fromEntries(feature.actions.map((action) => [action, allowed.includes('*') || allowed.includes(`${feature.id}:*`) || allowed.includes(`${feature.id}:${action}`)])),
  ]));
}

const defaultRoles = [
  { id: 'administrator', name: 'Administrador', description: 'Acesso completo às funcionalidades.', system: true, permissions: createPermissionMap(['*']) },
  { id: 'coordinator', name: 'Coordenador', description: 'Gerencia cadastros e atividades da congregação.', system: true, permissions: createPermissionMap(['inicio:view', 'novos-convertidos:*', 'turmas:*', 'alunos:*', 'aulas:view', 'professores:*', 'escala:*', 'chamadas:*', 'relatorios:*', 'frequencia:*', 'congregacao:view', 'integracoes:view']) },
  { id: 'teacher', name: 'Professor', description: 'Acessa a escala e registra chamadas.', system: true, permissions: createPermissionMap(['inicio:view', 'turmas:view', 'alunos:view', 'aulas:view', 'professores:view', 'escala:view', 'chamadas:view', 'chamadas:create', 'chamadas:edit', 'relatorios:view', 'frequencia:view']) },
  { id: 'viewer', name: 'Consulta', description: 'Somente leitura das informações autorizadas.', system: true, permissions: createPermissionMap(features.flatMap((feature) => [`${feature.id}:view`])) },
];

function normalizeRoles(value) {
  if (!Array.isArray(value)) return defaultRoles;
  const normalized = value.filter((role) => role && typeof role.id === 'string' && typeof role.name === 'string').map((role) => ({
    ...role,
    permissions: {
      ...createPermissionMap(),
      ...(role.permissions || {}),
    },
  }));
  return normalized.length ? normalized : defaultRoles;
}

function loadRoles(storageKey) {
  try {
    const stored = localStorage.getItem(storageKey);
    return stored ? normalizeRoles(JSON.parse(stored)) : defaultRoles;
  } catch {
    return defaultRoles;
  }
}

export default function PermissionsPage({ congregationId, congregationName }) {
  const storageKey = `chamada-permissions:${congregationId}`;
  const [roles, setRoles] = useState(() => loadRoles(storageKey));
  const [selectedRoleId, setSelectedRoleId] = useState(() => loadRoles(storageKey)[0]?.id || 'administrator');
  const [newRoleName, setNewRoleName] = useState('');
  const [notice, setNotice] = useState('');
  const [saved, setSaved] = useState(true);
  const selectedRole = roles.find((role) => role.id === selectedRoleId) || roles[0];
  const groupedFeatures = useMemo(() => features.reduce((groups, feature) => {
    groups[feature.group] ||= [];
    groups[feature.group].push(feature);
    return groups;
  }, {}), []);
  const enabledCount = selectedRole ? features.reduce((total, feature) => total + feature.actions.filter((action) => selectedRole.permissions?.[feature.id]?.[action]).length, 0) : 0;
  const totalCount = features.reduce((total, feature) => total + feature.actions.length, 0);

  const updatePermission = (featureId, action, checked) => {
    setRoles((current) => current.map((role) => role.id !== selectedRoleId ? role : {
      ...role,
      permissions: {
        ...role.permissions,
        [featureId]: { ...role.permissions[featureId], [action]: checked },
      },
    }));
    setSaved(false);
    setNotice('');
  };

  const addRole = (event) => {
    event.preventDefault();
    const name = newRoleName.trim();
    if (!name) return;
    const id = `custom-${crypto.randomUUID()}`;
    setRoles((current) => [...current, { id, name, description: 'Perfil personalizado.', system: false, permissions: createPermissionMap() }]);
    setSelectedRoleId(id);
    setNewRoleName('');
    setSaved(false);
    setNotice('');
  };

  const removeRole = () => {
    if (!selectedRole || selectedRole.system) return;
    const nextRoles = roles.filter((role) => role.id !== selectedRole.id);
    setRoles(nextRoles);
    setSelectedRoleId(nextRoles[0]?.id || 'administrator');
    setSaved(false);
    setNotice('');
  };

  const saveRoles = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(roles));
      setSaved(true);
      setNotice('Perfis e permissões salvos neste navegador para a congregação selecionada.');
    } catch {
      setNotice('Não foi possível salvar as permissões neste navegador.');
    }
  };

  const resetRoles = () => {
    setRoles(defaultRoles);
    setSelectedRoleId('administrator');
    setSaved(false);
    setNotice('');
  };

  return <div className="permissions-page">
    <section className="permissions-intro panel">
      <div className="permissions-intro-icon"><ShieldCheck size={23}/></div>
      <div className="permissions-intro-copy">
        <span className="permissions-eyebrow">ACESSO POR FUNCIONALIDADE</span>
        <h2>Perfis e permissões</h2>
        <p>Defina quais ações cada perfil pode executar em {congregationName || 'esta congregação'}.</p>
      </div>
      <div className="permissions-summary"><b>{enabledCount}<span>/{totalCount}</span></b><small>permissões ativas</small></div>
    </section>

    <div className="permissions-layout">
      <aside className="permissions-profiles panel">
        <div className="permissions-panel-heading"><div><h2>Perfis de acesso</h2><p>Escolha um perfil para configurar.</p></div><UsersRound size={19}/></div>
        <div className="permissions-role-list" role="tablist" aria-label="Perfis de acesso">
          {roles.map((role) => <button key={role.id} type="button" role="tab" aria-selected={selectedRole?.id === role.id} className={`permissions-role ${selectedRole?.id === role.id ? 'selected' : ''}`} onClick={() => setSelectedRoleId(role.id)}>
            <span className="permissions-role-avatar">{role.name.slice(0, 1).toUpperCase()}</span>
            <span className="permissions-role-copy"><b>{role.name}</b><small>{role.system ? 'Perfil padrão' : 'Personalizado'}</small></span>
            {selectedRole?.id === role.id && <Check size={16} aria-hidden="true"/>}
          </button>)}
        </div>
        <form className="permissions-add-role" onSubmit={addRole}>
          <label htmlFor="new-permission-role">Criar perfil personalizado</label>
          <div><input id="new-permission-role" value={newRoleName} maxLength={48} onChange={(event) => setNewRoleName(event.target.value)} placeholder="Ex.: Secretário"/><button type="submit" className="permissions-add-button" disabled={!newRoleName.trim()} aria-label="Adicionar perfil"><CopyPlus size={17}/></button></div>
        </form>
      </aside>

      <section className="permissions-editor panel" aria-labelledby="permissions-editor-title">
        <header className="permissions-editor-heading">
          <div><span className="permissions-eyebrow">PERFIL SELECIONADO</span><h2 id="permissions-editor-title">{selectedRole?.name}</h2><p>{selectedRole?.description}</p></div>
          <div className="permissions-editor-actions">
            {!selectedRole?.system && <button type="button" className="permissions-delete-button" onClick={removeRole}><Trash2 size={16}/> Remover perfil</button>}
            <button type="button" className="button secondary" onClick={resetRoles}><RotateCcw size={15}/> Restaurar padrões</button>
            <button type="button" className="button primary" onClick={saveRoles} disabled={saved}><Save size={15}/> Salvar permissões</button>
          </div>
        </header>

        <div className="permissions-matrix-wrap">
          <table className="permissions-matrix">
            <thead><tr><th scope="col">Funcionalidade</th>{['view', 'create', 'edit', 'delete', 'export', 'generate'].map((action) => <th scope="col" key={action}>{actionLabels[action]}</th>)}</tr></thead>
            {Object.entries(groupedFeatures).map(([group, groupFeatures]) => <tbody key={group}>
              <tr className="permissions-group-row"><th colSpan={7} scope="colgroup">{group}</th></tr>
              {groupFeatures.map((feature) => <tr key={feature.id}>
                <th scope="row"><span>{feature.label}</span></th>
                {['view', 'create', 'edit', 'delete', 'export', 'generate'].map((action) => <td key={action}>
                  {feature.actions.includes(action) ? <label className="permission-checkbox" aria-label={`${actionLabels[action]}: ${feature.label}`}><input type="checkbox" disabled={selectedRole?.id === 'administrator'} checked={Boolean(selectedRole?.permissions?.[feature.id]?.[action])} onChange={(event) => updatePermission(feature.id, action, event.target.checked)}/><span/></label> : <span className="permission-unavailable" aria-label="Ação não disponível">—</span>}
                </td>)}
              </tr>)}
            </tbody>)}
          </table>
        </div>
        <footer className="permissions-footer">
          <p className="permissions-notice" role="status">{notice || (saved ? 'As alterações salvas ficam associadas a este navegador e congregação.' : 'Há alterações ainda não salvas.')}</p>
          <div className="permissions-legend"><span><i className="permission-legend-on"/> Permitido</span><span><i className="permission-legend-off"/> Não permitido</span></div>
        </footer>
      </section>
    </div>

    <aside className="permissions-implementation-note">
      <ShieldCheck size={17}/>
      <p><b>Importante:</b> esta tela configura e persiste a matriz no navegador. Para que as regras sejam aplicadas como controle de segurança, cada conta precisa ser associada a um perfil no servidor, e a API deve verificar essas permissões em cada operação.</p>
    </aside>
  </div>;
}
