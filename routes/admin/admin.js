import { 
  getAdminStudents, deleteStudent, getStudentList, getPassiveStudents, reactivateStudent, permanentlyDeleteStudent, updateStudent, changeStudentCourse
} from './admin_student_modules.js';
import { 
  getAdminGuardians, deleteGuardian, searchGuardians, getPassiveGuardians, reactivateGuardian, permanentlyDeleteGuardian
} from './admin_guardian_modules.js';
import { 
  getAdminTeachers, deleteTeacher, getPassiveTeachers, reactivateTeacher, permanentlyDeleteTeacher, updateTeacher
} from './admin_teacher_modules.js';
import { getDashboardStats } from './admin_dashboard_modules.js';

export {
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
}; 