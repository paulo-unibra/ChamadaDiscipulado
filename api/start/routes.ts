/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'

const SchoolController = () => import('#controllers/school_controller')
const AuthController = () => import('#controllers/auth_controller')
const RequireAuthMiddleware = () => import('#middleware/require_auth_middleware')

router.get('/', async () => {
  return {
    app: 'chamada-discipulado-api',
    status: 'ok',
    database: 'mysql/discipulado',
  }
})

router.post('/auth/login', [AuthController, 'login'])
router.post('/auth/verify', [AuthController, 'verify'])
router.post('/auth/password', [AuthController, 'changePassword']).use(RequireAuthMiddleware)
router.post('/auth/logout', [AuthController, 'logout']).use(RequireAuthMiddleware)

router
  .group(() => {
    router.get('/school/state', [SchoolController, 'state'])
    router.get('/school/audit-logs', [SchoolController, 'auditLogs'])

    router.post('/school/classes', [SchoolController, 'createClass'])
    router.delete('/school/classes/:id', [SchoolController, 'deleteClass'])

    router.post('/school/students', [SchoolController, 'createStudent'])
    router.delete('/school/students/:id', [SchoolController, 'deleteStudent'])
    router.post('/school/students/assign', [SchoolController, 'assignStudentToClass'])
    router.post('/school/students/remove', [SchoolController, 'removeStudentFromClass'])

    router.post('/school/teachers', [SchoolController, 'createTeacher'])
    router.delete('/school/teachers/:id', [SchoolController, 'deleteTeacher'])

    router.post('/school/attendance', [SchoolController, 'saveAttendance'])
    router.delete('/school/attendance/:id', [SchoolController, 'deleteAttendance'])

    router.get('/school/reports/student-timeline', [SchoolController, 'studentTimeline'])
  })
  .use(RequireAuthMiddleware)
