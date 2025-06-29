import express from 'express';
import { login, getUserInfo } from './auth.js';
import { registerGuardian, registerTeacher, registerStudent } from './register.js';
import { getGuardianStudents, getStudentDashboards, getStudentInfo, getStudentProgram } from './guardian.js';
import {
  getAdminStudents,
  deleteStudent,
  getStudentList,
  getPassiveStudents,
  reactivateStudent,
  permanentlyDeleteStudent,
  getAdminGuardians,
  deleteGuardian,
  searchGuardians,
  getPassiveGuardians,
  reactivateGuardian,
  permanentlyDeleteGuardian,
  getAdminTeachers,
  deleteTeacher,
  getPassiveTeachers,
  reactivateTeacher,
  permanentlyDeleteTeacher,
  getDashboardStats,
  updateStudent,
  changeStudentCourse,
  updateTeacher
} from './admin/admin.js';
import { getProgramsByCourse, getCategories, getCourseLevels, getCourses, toggleCourseStatus, addCourse, updateCourse, deleteCourse, getClassrooms, getClassroomsByCategory, addProgram } from './courses.js';
import {
  createTeacherAssignment,
  getTeacherAssignments,
  deleteTeacherAssignment,
  getAvailableTeachers,
  getTeacherSchedule
} from './teacherAssignments.js';

const router = express.Router();

// Authentication routes
router.post('/login', login);
router.get('/api/user', getUserInfo);

// Registration routes
router.post('/register', registerGuardian);
router.post('/register_teacher', registerTeacher);
router.post('/student_register', registerStudent);

// Guardian routes
router.get('/api/guardian/students', getGuardianStudents);
router.get('/dashboard/students', getStudentDashboards);
router.get('/api/student/:id', getStudentInfo);
router.get('/api/student/:id/program', getStudentProgram);

// Admin routes
router.get('/api/admin/students', getAdminStudents);
router.delete('/api/admin/students/:id', deleteStudent);
router.get('/api/admin/guardians', getAdminGuardians);
router.delete('/api/guardians/:id', deleteGuardian);
router.get('/api/guardians/search', searchGuardians);
router.get('/api/admin/student-list', getStudentList);
router.get('/api/admin/teachers', getAdminTeachers);
router.delete('/api/admin/teachers/:id', deleteTeacher);
router.get('/api/admin/dashboard-stats', getDashboardStats);
router.put('/api/admin/students/:studentId', updateStudent);
router.put('/api/admin/students/:studentId/change-course', changeStudentCourse);

// Passive user routes
router.get('/api/admin/passive-students', getPassiveStudents);
router.get('/api/admin/passive-guardians', getPassiveGuardians);
router.get('/api/admin/passive-teachers', getPassiveTeachers);

// Reactivation routes
router.put('/api/admin/reactivate-student/:id', reactivateStudent);
router.put('/api/admin/reactivate-guardian/:id', reactivateGuardian);
router.put('/api/admin/reactivate-teacher/:id', reactivateTeacher);

// Course routes
router.get('/api/programs/by-course/:courseId', getProgramsByCourse);
router.get('/api/categories', getCategories);
router.get('/api/course-levels', getCourseLevels);
router.get('/api/courses', getCourses);
router.post('/api/courses', addCourse);
router.put('/api/courses/:courseId', updateCourse);
router.delete('/api/courses/:courseId', deleteCourse);
router.put('/api/courses/:courseId/toggle-status', toggleCourseStatus);

// Classroom and Program routes
router.get('/api/classrooms', getClassrooms);
router.get('/api/classrooms/by-category/:categoryId', getClassroomsByCategory);
router.post('/api/programs', addProgram);

// Teacher assignment routes
router.post('/api/teacher-assignments', createTeacherAssignment);
router.get('/api/teacher-assignments', getTeacherAssignments);
router.delete('/api/teacher-assignments/:id', deleteTeacherAssignment);
router.get('/api/available-teachers', getAvailableTeachers);
router.get('/api/teacher-schedule/:teacherId', getTeacherSchedule);
router.put('/api/admin/teachers/:teacherId', updateTeacher);

// New route for permanently deleting a student
router.delete('/api/admin/permanently-delete-student/:id', permanentlyDeleteStudent);

// New route for permanently deleting a guardian
router.delete('/api/admin/permanently-delete-guardian/:id', permanentlyDeleteGuardian);

// New route for permanently deleting a teacher
router.delete('/api/admin/permanently-delete-teacher/:id', permanentlyDeleteTeacher);

export default router; 