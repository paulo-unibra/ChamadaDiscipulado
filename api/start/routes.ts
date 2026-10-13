/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { middleware } from './kernel.js'

const SchoolController = () => import('#controllers/school_controller')
const AuthController = () => import('#controllers/auth_controller')
const IntegrationsController = () => import('#controllers/integrations_controller')
const QuizzesController = () => import('#controllers/quizzes_controller')

router.get('/', async () => {
  return {
    app: 'chamada-discipulado-api',
    status: 'ok',
  }
})

router.get('/health', async ({ request, response }) => {
  try {
    await db.rawQuery('SELECT 1')
    return response.ok({ status: 'ok', database: 'ok' })
  } catch (error) {
    logger.error(
      { err: error, requestId: request.header('x-request-id') },
      'Health check database query failed'
    )
    return response.serviceUnavailable({ status: 'unavailable', database: 'unavailable' })
  }
})

router.post('/auth/login', [AuthController, 'login']).use(middleware.rateLimit())
router.post('/auth/verify', [AuthController, 'verify']).use(middleware.rateLimit())
router.get('/auth/session', [AuthController, 'session']).use(middleware.requireAuth())
router.post('/auth/password', [AuthController, 'changePassword']).use(middleware.requireAuth())
router.post('/auth/logout', [AuthController, 'logout']).use(middleware.requireAuth())

router
  .group(() => {
    router.get('/integrations/google/forms', [IntegrationsController, 'show'])
    router.put('/integrations/google/forms', [IntegrationsController, 'save'])
    router.get('/integrations/chatgpt', [IntegrationsController, 'showChatGpt'])
    router.put('/integrations/chatgpt', [IntegrationsController, 'saveChatGpt'])
    router.get('/integrations/deepseek', [IntegrationsController, 'showDeepSeek'])
    router.put('/integrations/deepseek', [IntegrationsController, 'saveDeepSeek'])
    router.get('/integrations/google/forms/:formId/questions', [
      IntegrationsController,
      'questions',
    ])
    router.get('/integrations/google/forms/sent-items', [IntegrationsController, 'sentItems'])
    router.post('/integrations/google/forms/mark-sent', [IntegrationsController, 'markSent'])
    router.get('/school/state', [SchoolController, 'state'])
    router.post('/school/congregations', [SchoolController, 'createCongregation'])
    router.put('/school/congregations/:id', [SchoolController, 'updateCongregation'])
    router.post('/school/new-converts', [SchoolController, 'createNewConvert'])
    router.put('/school/new-converts/:id', [SchoolController, 'updateNewConvert'])
    router.delete('/school/new-converts/:id', [SchoolController, 'deleteNewConvert'])
    router.get('/school/audit-logs', [SchoolController, 'auditLogs'])

    router.post('/school/classes', [SchoolController, 'createClass'])
    router.delete('/school/classes/:id', [SchoolController, 'deleteClass'])
    router.put('/school/classes/:id/scale', [SchoolController, 'saveClassScale'])
    router.get('/school/classes/:id/scale/export', [SchoolController, 'exportClassScale'])
    router.get('/school/quizzes', [QuizzesController, 'list'])
    router.post('/school/classes/:classId/scale/:scheduleId/quizzes', [
      QuizzesController,
      'generate',
    ])
    router.put('/school/classes/:id/start-date', [SchoolController, 'updateClassStartDate'])

    router.post('/school/students', [SchoolController, 'createStudent'])
    router.delete('/school/students/:id', [SchoolController, 'deleteStudent'])
    router.post('/school/students/assign', [SchoolController, 'assignStudentToClass'])
    router.post('/school/students/remove', [SchoolController, 'removeStudentFromClass'])

    router.post('/school/teachers', [SchoolController, 'createTeacher'])
    router.put('/school/teachers/:id', [SchoolController, 'updateTeacher'])
    router.delete('/school/teachers/:id', [SchoolController, 'deleteTeacher'])

    router.post('/school/attendance', [SchoolController, 'saveAttendance'])
    router.delete('/school/attendance/:id', [SchoolController, 'deleteAttendance'])

    router.get('/school/reports/student-timeline', [SchoolController, 'studentTimeline'])
  })
  .use(middleware.requireAuth())
