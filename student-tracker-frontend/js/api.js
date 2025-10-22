// Minimal API wrapper (stubbed). Replace with real fetch() to your backend later.
const API_BASE = 'http://localhost:3000/api';
const api = {
  async listMyClasses(me){
    return me.role==='INSTRUCTOR'
      ? [{id:101,title:'CSCI 1010',term:'Fall 2025'},{id:202,title:'CSCI 2020',term:'Fall 2025'}]
      : [{id:101,title:'CSCI 1010',term:'Fall 2025'}];
  },
  async createClass({title,term}){ return { id: Math.floor(Math.random()*10000), title, term }; },
  async getClass(id){ return { id:Number(id), title:'CSCI 1010', term:'Fall 2025' }; },
  async getRoster(classId){ return [{id:3,fullName:'Student One',email:'s1@example.com'},{id:4,fullName:'Student Two',email:'s2@example.com'}]; },
  async getAttendance(classId){
    const now = new Date(); return [{ id:1, full_name:'Student One', check_in_time: now.toISOString(), check_out_time:null, check_in_lat:36.17, check_in_lon:-86.78, method:'self' }];
  },
  async checkIn(classId, geo){ return { ok:true, classId, geo }; },
  async checkOut(classId, geo){ return { ok:true, classId, geo }; },
  async listUsers(){ return [{id:1,fullName:'Admin User',email:'admin@example.com',role:'ADMIN'},{id:2,fullName:'Instructor User',email:'instructor@example.com',role:'INSTRUCTOR'},{id:3,fullName:'Student One',email:'student@example.com',role:'STUDENT'}]; },
  async createUser({fullName,email,role}){ return { id:Math.floor(Math.random()*10000), fullName, email, role }; }
};
