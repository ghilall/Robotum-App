import express from 'express';
import * as authRoutes from './auth.js';
import * as registerRoutes from './register.js';
import * as guardianRoutes from './guardian.js';
import * as adminRoutes from './admin/admin.js';
import * as courseRoutes from './courses.js';
import * as teacherAssignmentRoutes from './teacherAssignments.js';

const router = express.Router();

// Authentication routes
router.post('/login', authRoutes.login);
router.get('/api/user', authRoutes.getUserInfo);

// Registration routes
router.post('/register', registerRoutes.registerGuardian);
router.post('/register_teacher', registerRoutes.registerTeacher);
router.post('/student_register', registerRoutes.registerStudent);

// Guardian routes
router.get('/api/guardian/students', guardianRoutes.getGuardianStudents);
router.get('/dashboard/students', guardianRoutes.getStudentDashboards);
router.get('/api/student/:id', guardianRoutes.getStudentInfo);
router.get('/api/student/:id/program', guardianRoutes.getStudentProgram);

// Admin routes
router.get('/api/admin/students', adminRoutes.getAdminStudents);
router.delete('/api/admin/students/:id', adminRoutes.deleteStudent);
router.get('/api/admin/guardians', adminRoutes.getAdminGuardians);
router.delete('/api/guardians/:id', adminRoutes.deleteGuardian);
router.get('/api/guardians/search', adminRoutes.searchGuardians);
router.get('/api/admin/student-list', adminRoutes.getStudentList);
router.get('/api/admin/teachers', adminRoutes.getAdminTeachers);
router.delete('/api/admin/teachers/:id', adminRoutes.deleteTeacher);
router.get('/api/admin/dashboard-stats', adminRoutes.getDashboardStats);
router.put('/api/admin/students/:studentId', adminRoutes.updateStudent);
router.put('/api/admin/students/:studentId/change-course', adminRoutes.changeStudentCourse);

// Passive user routes
router.get('/api/admin/passive-students', adminRoutes.getPassiveStudents);
router.get('/api/admin/passive-guardians', adminRoutes.getPassiveGuardians);
router.get('/api/admin/passive-teachers', adminRoutes.getPassiveTeachers);

// Reactivation routes
router.put('/api/admin/reactivate-student/:id', adminRoutes.reactivateStudent);
router.put('/api/admin/reactivate-guardian/:id', adminRoutes.reactivateGuardian);
router.put('/api/admin/reactivate-teacher/:id', adminRoutes.reactivateTeacher);

// Course routes
router.get('/api/programs/by-course/:courseId', courseRoutes.getProgramsByCourse);
router.get('/api/categories', courseRoutes.getCategories);
router.get('/api/course-levels', courseRoutes.getCourseLevels);
router.get('/api/courses', courseRoutes.getCourses);

// Teacher assignment routes
router.post('/api/teacher-assignments', teacherAssignmentRoutes.createTeacherAssignment);
router.get('/api/teacher-assignments', teacherAssignmentRoutes.getTeacherAssignments);
router.delete('/api/teacher-assignments/:id', teacherAssignmentRoutes.deleteTeacherAssignment);
router.get('/api/available-teachers', teacherAssignmentRoutes.getAvailableTeachers);
router.get('/api/teacher-schedule/:teacherId', teacherAssignmentRoutes.getTeacherSchedule);

// New route for permanently deleting a student
router.delete('/api/admin/permanently-delete-student/:id', adminRoutes.permanentlyDeleteStudent);

// New route for permanently deleting a guardian
router.delete('/api/admin/permanently-delete-guardian/:id', adminRoutes.permanentlyDeleteGuardian);

// New route for permanently deleting a teacher
router.delete('/api/admin/permanently-delete-teacher/:id', adminRoutes.permanentlyDeleteTeacher);

export default router; 