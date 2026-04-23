/**
 * config.js — ChitTrack
 * Global UI constants. Fund-specific data lives in each fund object.
 */

'use strict';

const CONFIG = Object.freeze({
  STORAGE_KEY: 'chittrack_v2',
  MAX_MEMBERS: 100,
  MAX_MONTHS:  60,
});

const AVATAR_COLORS = Object.freeze([
  '#FDE68A','#BFDBFE','#BBF7D0','#FECACA','#DDD6FE','#FED7AA',
  '#CFFAFE','#FCE7F3','#D1FAE5','#FEF9C3','#E0E7FF','#FFE4E6',
  '#F0FDF4','#EFF6FF','#FFF7ED','#FDF2F8','#F0F9FF','#FEFCE8',
  '#F7FEE7','#FFF1F2','#ECFDF5','#EEF2FF','#FDF4FF','#FFFBEB','#F0FDFA',
]);

const DEFAULT_FUND_TEMPLATE = Object.freeze({
  id:            'fund_default',
  name:          'Chit Fund 2026-28',
  monthlyAmount: 13000,
  memberCount:   25,
  monthCount:    26,
  potAmount:     325000,
  dates: Object.freeze([
    '2026-03-05','2026-04-05','2026-05-05','2026-06-05','2026-07-05',
    '2026-08-05','2026-09-05','2026-10-05','2026-11-05','2026-12-05',
    '2027-01-05','2027-02-05','2027-03-05','2027-04-05','2027-05-05',
    '2027-06-05','2027-07-05','2027-08-05','2027-09-05','2027-10-05',
    '2027-11-05','2027-12-05','2028-01-05','2028-02-05','2028-03-05',
    '2028-04-05',
  ]),
  scheduleData: Object.freeze([
    [13000,282000],[16000,null  ],[13000,284000],[13000,286000],[13000,288000],
    [13000,290000],[13000,292000],[13000,295000],[13000,298000],[13000,301000],
    [13000,304000],[13000,308000],[13000,312000],[13000,317000],[13000,321000],
    [13000,325000],[13000,331000],[13000,337000],[13000,343000],[13000,349000],
    [13000,355000],[13000,363000],[13000,371000],[13000,380000],[13000,390000],
    [13000,400000],
  ]),
  members: Object.freeze([
    {id:1, name:'Ravi Kumar',     phone:'9876501001',email:'ravi@email.com',    slotNo:1, borrowerMonth:1, notes:''},
    {id:2, name:'Priya Sharma',   phone:'9876501002',email:'priya@email.com',   slotNo:2, borrowerMonth:2, notes:''},
    {id:3, name:'Suresh Babu',    phone:'9876501003',email:'suresh@email.com',  slotNo:3, borrowerMonth:3, notes:''},
    {id:4, name:'Meena Devi',     phone:'9876501004',email:'meena@email.com',   slotNo:4, borrowerMonth:4, notes:''},
    {id:5, name:'Arjun Reddy',    phone:'9876501005',email:'arjun@email.com',   slotNo:5, borrowerMonth:5, notes:''},
    {id:6, name:'Lakshmi Nair',   phone:'9876501006',email:'lakshmi@email.com', slotNo:6, borrowerMonth:6, notes:''},
    {id:7, name:'Kiran Patel',    phone:'9876501007',email:'kiran@email.com',   slotNo:7, borrowerMonth:7, notes:''},
    {id:8, name:'Deepa Menon',    phone:'9876501008',email:'deepa@email.com',   slotNo:8, borrowerMonth:8, notes:''},
    {id:9, name:'Venkat Rao',     phone:'9876501009',email:'venkat@email.com',  slotNo:9, borrowerMonth:9, notes:''},
    {id:10,name:'Anitha Das',     phone:'9876501010',email:'anitha@email.com',  slotNo:10,borrowerMonth:10,notes:''},
    {id:11,name:'Ramesh Iyer',    phone:'9876501011',email:'ramesh@email.com',  slotNo:11,borrowerMonth:11,notes:''},
    {id:12,name:'Sunita Verma',   phone:'9876501012',email:'sunita@email.com',  slotNo:12,borrowerMonth:12,notes:''},
    {id:13,name:'Manoj Gupta',    phone:'9876501013',email:'manoj@email.com',   slotNo:13,borrowerMonth:13,notes:''},
    {id:14,name:'Kavya Singh',    phone:'9876501014',email:'kavya@email.com',   slotNo:14,borrowerMonth:14,notes:''},
    {id:15,name:'Dinesh Kumar',   phone:'9876501015',email:'dinesh@email.com',  slotNo:15,borrowerMonth:15,notes:''},
    {id:16,name:'Radha Krishnan', phone:'9876501016',email:'radha@email.com',   slotNo:16,borrowerMonth:16,notes:''},
    {id:17,name:'Sanjay Mehta',   phone:'9876501017',email:'sanjay@email.com',  slotNo:17,borrowerMonth:17,notes:''},
    {id:18,name:'Pooja Tiwari',   phone:'9876501018',email:'pooja@email.com',   slotNo:18,borrowerMonth:18,notes:''},
    {id:19,name:'Harish Yadav',   phone:'9876501019',email:'harish@email.com',  slotNo:19,borrowerMonth:19,notes:''},
    {id:20,name:'Nirmala Bhat',   phone:'9876501020',email:'nirmala@email.com', slotNo:20,borrowerMonth:20,notes:''},
    {id:21,name:'Sunil Pillai',   phone:'9876501021',email:'sunil@email.com',   slotNo:21,borrowerMonth:21,notes:''},
    {id:22,name:'Geeta Joshi',    phone:'9876501022',email:'geeta@email.com',   slotNo:22,borrowerMonth:22,notes:''},
    {id:23,name:'Prakash Naidu',  phone:'9876501023',email:'prakash@email.com', slotNo:23,borrowerMonth:23,notes:''},
    {id:24,name:'Usha Rani',      phone:'9876501024',email:'usha@email.com',    slotNo:24,borrowerMonth:24,notes:''},
    {id:25,name:'Vinod Sharma',   phone:'9876501025',email:'vinod@email.com',   slotNo:25,borrowerMonth:25,notes:''},
  ]),
});
