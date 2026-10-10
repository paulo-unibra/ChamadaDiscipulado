import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import PermissionsPage from './PermissionsPage';

describe('PermissionsPage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('renders a permissions row for each application feature', () => {
    render(<PermissionsPage congregationId="cong-a" congregationName="Congregação A"/>);
    expect(screen.getByRole('heading', { name: 'Perfis e permissões' })).toBeInTheDocument();
    expect(screen.getByText('Novos convertidos')).toBeInTheDocument();
    expect(screen.getByText('Escala de aulas')).toBeInTheDocument();
    expect(screen.getByText('Integrações')).toBeInTheDocument();
  });

  it('saves permission changes independently for each congregation', () => {
    const view = render(<PermissionsPage congregationId="cong-a" congregationName="Congregação A"/>);
    fireEvent.click(screen.getByRole('tab', { name: /Consulta/ }));
    const editClasses = screen.getByRole('checkbox', { name: 'Editar: Turmas' });
    expect(editClasses).not.toBeChecked();
    fireEvent.click(editClasses);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar permissões' }));
    expect(JSON.parse(localStorage.getItem('chamada-permissions:cong-a'))[3].permissions.turmas.edit).toBe(true);

    view.unmount();
    render(<PermissionsPage congregationId="cong-b" congregationName="Congregação B"/>);
    fireEvent.click(screen.getByRole('tab', { name: /Consulta/ }));
    expect(screen.getByRole('checkbox', { name: 'Editar: Turmas' })).not.toBeChecked();
  });

  it('creates and saves a custom access profile', () => {
    render(<PermissionsPage congregationId="cong-a" congregationName="Congregação A"/>);
    fireEvent.change(screen.getByLabelText('Criar perfil personalizado'), { target: { value: 'Secretaria' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar perfil' }));
    expect(screen.getByRole('heading', { name: 'Secretaria' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar permissões' }));
    expect(JSON.parse(localStorage.getItem('chamada-permissions:cong-a')).some((role) => role.name === 'Secretaria')).toBe(true);
  });
});
