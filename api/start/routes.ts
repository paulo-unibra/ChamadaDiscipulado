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

router.get('/', async () => {
  return {
    app: 'chamada-discipulado-api',
    status: 'ok',
    database: 'mysql/discipulado',
  }
})

router.get('/school/state', [SchoolController, 'state'])

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
