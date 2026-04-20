import React, { useState, useEffect, useRef } from 'react';
import { LogIn, ShieldCheck, User, Briefcase, FileText, LayoutDashboard, Users, Settings, LogOut, Printer, PlusCircle, Trash2, Edit, X, Camera, PenTool, Download, Upload, AlertTriangle, Send, Search, ExternalLink, Link2, Phone } from 'lucide-react';

type Role = string | null;

interface RoleItem {
  id: number;
  name: string;
  slug: string;
  name_bn: string;
  description: string;
  permissions?: string;
  status: 'Active' | 'Inactive';
}

const STATUS_CONFIG: Record<string, { label: string, color: string }> = {
  'Submitted': { label: 'বিভাগীয় প্রধানের নিকট দাখিলকৃত', color: 'bg-gray-400' },
  'Forwarded for Approval': { label: 'প্রয়োজনীয় ব্যবস্থা গ্রহণের জন্য প্রেরিত', color: 'bg-indigo-500' },
  'In Progress': { label: 'প্রক্রিয়াধীন', color: 'bg-yellow-500' },
  'Done': { label: 'সম্পন্ন', color: 'bg-green-500' },
  'Rejected by Divisional Head': { label: 'আবেদনটি প্রত্যাখান করা হয়েছে', color: 'bg-red-500' },
  'Presented in File': { label: 'নথিতে উপস্থাপন করা হয়েছে', color: 'bg-blue-500' }
};

const AVAILABLE_FEATURES = [
  { id: 'dashboard', name: 'ড্যাশবোর্ড' },
  { id: 'application_form', name: 'আবেদন ফরম' },
  { id: 'application_history', name: 'আবেদনের ইতিহাস' },
  { id: 'all_applications', name: 'সকল আবেদন' },
  { id: 'received_applications', name: 'আগত আবেদনসমূহ' },
  { id: 'forwarded_applications', name: 'প্রেরিত আবেদনসমূহ' },
  { id: 'rejected_applications', name: 'বাতিলকৃত আবেদনসমূহ' },
  { id: 'assigned_applications', name: 'অ্যাসাইনকৃত আবেদন' },
  { id: 'service_provider_hardware', name: 'Service Provider (Hardware)' },
  { id: 'service_provider_network', name: 'Service Provider (Network)' },
  { id: 'service_provider_software', name: 'Service Provider (Software)' },
  { id: 'service_provider_maintenance', name: 'Service Provider (Maintenance)' },
  { id: 'user_management', name: 'ইউজার ম্যানেজমেন্ট' },
  { id: 'role_management', name: 'রোল ম্যানেজমেন্ট' },
  { id: 'division_management', name: 'বিভাগ ম্যানেজমেন্ট' },
  { id: 'profile', name: 'প্রোফাইল' },
  { id: 'reports', name: 'রিপোর্ট' },
  { id: 'settings', name: 'সেটিংস' },
  { id: 'telephone_directory', name: 'টেলিফোন ডিরেক্টরি' },
];

const SERVICE_PROVIDER_FEATURES = [
  'service_provider_hardware',
  'service_provider_network',
  'service_provider_software',
  'service_provider_maintenance',
] as const;

const isServiceProviderFeature = (value?: string | null) =>
  !!value && SERVICE_PROVIDER_FEATURES.includes(value as typeof SERVICE_PROVIDER_FEATURES[number]);

const DATA_SHARE_SCOPE_OPTIONS = [
  { id: 'applications', name: 'Applications' },
  { id: 'assignments', name: 'Item assignments' },
  { id: 'telephone_directory', name: 'Telephone directory' },
  { id: 'divisions', name: 'Divisions' },
  { id: 'reports', name: 'Reports page' },
] as const;

type DataShareScope = typeof DATA_SHARE_SCOPE_OPTIONS[number]['id'];

type DataShareClient = {
  id: number;
  name: string;
  scopes: DataShareScope[];
  status: 'Active' | 'Revoked';
  created_by?: string;
  created_at?: string;
  last_used_at?: string | null;
  revoked_at?: string | null;
};

type DataShareAccessLog = {
  id: number;
  client_id?: number | null;
  client_name?: string | null;
  direction: 'Pull' | 'Push';
  scope: string;
  endpoint: string;
  method: string;
  status_code: number;
  row_count: number;
  ip?: string | null;
  user_agent?: string | null;
  details?: unknown;
  created_at: string;
};

interface UserData {
  name: string;
  name_bn: string;
  email: string;
  role: Role;
  division?: string;
  designation?: string;
  mobile?: string;
  photo?: string;
  signature?: string;
  pending_signature?: string;
  signature_pending_at?: string;
  must_change_password?: boolean;
  permissions?: string[];
}

const DESK_OFFICER_CATEGORY_MAP: Record<string, string> = {
  desk_officer_hardware: 'হার্ডওয়্যার',
  desk_officer_network: 'নেটওয়ার্ক',
  desk_officer_software: 'সফটওয়্যার',
  desk_officer_maintenance: 'সিস্টেম মেইনটেন্যান্স',
};

const SERVICE_CATEGORIES = ['হার্ডওয়্যার', 'নেটওয়ার্ক', 'সফটওয়্যার', 'সিস্টেম মেইনটেন্যান্স'] as const;
const SERVICE_CATEGORY_LABELS: Record<(typeof SERVICE_CATEGORIES)[number], string> = {
  'হার্ডওয়্যার': 'হার্ডওয়্যার সংক্রান্ত সেবা',
  'নেটওয়ার্ক': 'নেটওয়ার্ক সংক্রান্ত সেবা',
  'সফটওয়্যার': 'সফটওয়্যার সংক্রান্ত সেবা',
  'সিস্টেম মেইনটেন্যান্স': 'সিস্টেম মেইনটেন্যান্স',
};
const SERVICE_REQUEST_TYPES = ['নতুন সরবরাহ', 'মেরামত/সেবা প্রদান'] as const;
const SERVICE_ITEMS_BY_CATEGORY: Record<(typeof SERVICE_CATEGORIES)[number], string[]> = {
  'হার্ডওয়্যার': ['সিপিইউ', 'প্রিন্টার/টোনার', 'ল্যাপটপ', 'ইউপিএস', 'মনিটর', 'স্ক্যানার', 'ট্যাব', 'অন্যান্য'],
  'নেটওয়ার্ক': ['ল্যান', 'অডিও ভিজ্যুয়াল সাপোর্ট', 'সিসিটিভি সার্ভেইল্যান্স', 'আইপি ফোন', 'ওয়াইফাই', 'হাইব্রিড সভা', 'এক্সেস কন্ট্রোল', 'অন্যান্য'],
  'সফটওয়্যার': ['ডি-নথি', 'ই-মেইল', 'ই-জিপি', 'ইনফো', 'ওয়েবসাইট', 'এন্টিভাইরাস', 'জিআরপি', 'অন্যান্য'],
  'সিস্টেম মেইনটেন্যান্স': ['ডিজিটাল ডিসপ্লে', 'ওয়েবসাইটে তথ্য আপলোড', 'সার্ভার মেইনটেন্যান্স', 'অন্যান্য'],
};
const REPORT_STATUS_OPTIONS = ['Submitted', 'Forwarded for Approval', 'In Progress', 'Presented in File', 'Done', 'Rejected by Divisional Head'] as const;
const SETTINGS_STORAGE_KEY = 'ugc_system_settings_v1';
const SETTINGS_UPDATED_EVENT = 'ugc-system-settings-updated';
const QUICK_LINK_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

type ManagedCategory = {
  id: string;
  key: string;
  label: string;
  items: string[];
  officerRole: string;
  active: boolean;
};

type QuickLinkItem = {
  id: string;
  title: string;
  description: string;
  url: string;
};

type DailyQuote = {
  quote: string;
  author: string;
};

type FormBranding = {
  logoUrl: string;
  headerTitleBn: string;
  headerTitleEn: string;
  headerAddress: string;
  headerWebsite: string;
  formTitle: string;
};

type AppSystemSettings = {
  emailNotifications: boolean;
  maintenanceMode: boolean;
  dailyQuotesEnabled: boolean;
  dailyQuotes: DailyQuote[];
  requestTypes: string[];
  categories: ManagedCategory[];
  quickLinks: QuickLinkItem[];
  formBranding: FormBranding;
};

const DEFAULT_OFFICER_OPTIONS = [
  { value: 'desk_officer_hardware', label: 'ডেস্ক অফিসার (হার্ডওয়্যার)' },
  { value: 'desk_officer_network', label: 'ডেস্ক অফিসার (নেটওয়ার্ক)' },
  { value: 'desk_officer_software', label: 'ডেস্ক অফিসার (সফটওয়্যার)' },
  { value: 'desk_officer_maintenance', label: 'ডেস্ক অফিসার (মেইনটেন্যান্স)' },
] as const;

const DEFAULT_SERVICE_PROVIDER_OPTIONS = [
  { value: 'service_provider_hardware', label: 'à¦¸à§‡à¦¬à¦¾ à¦ªà§à¦°à¦¦à¦¾à¦¨à¦•à¦¾à¦°à§€ (à¦¹à¦¾à¦°à§à¦¡à¦“à¦¯à¦¼à§à¦¯à¦¾à¦°)' },
  { value: 'service_provider_network', label: 'à¦¸à§‡à¦¬à¦¾ à¦ªà§à¦°à¦¦à¦¾à¦¨à¦•à¦¾à¦°à§€ (à¦¨à§‡à¦Ÿà¦“à¦¯à¦¼à¦¾à¦°à§à¦•)' },
  { value: 'service_provider_software', label: 'à¦¸à§‡à¦¬à¦¾ à¦ªà§à¦°à¦¦à¦¾à¦¨à¦•à¦¾à¦°à§€ (à¦¸à¦«à¦Ÿà¦“à¦¯à¦¼à§à¦¯à¦¾à¦°)' },
  { value: 'service_provider_maintenance', label: 'à¦¸à§‡à¦¬à¦¾ à¦ªà§à¦°à¦¦à¦¾à¦¨à¦•à¦¾à¦°à§€ (à¦®à§‡à¦‡à¦¨à¦Ÿà§‡à¦¨à§à¦¯à¦¾à¦¨à§à¦¸)' },
] as const;

const DAILY_TECH_QUOTES_BN_SEED: DailyQuote[] = [
  { quote: "প্রযুক্তি মানুষের জীবনকে সহজ করে তোলে, যদি না আমরা এটাকে জটিল করে তেই ফেলি।", author: "বিশ্ব সংযুক্ত" },
  { quote: "কৃত্রিম বুদ্ধিমত্তা হলো নতুন বিদ্যুৎ - এটা সব কিছু পরিবর্তন করবে।", author: "অ্যান্ড্রু এনজি" },
  { quote: "ডিজিটাল প্রযুক্তি মানুষের সৃজনশীলতার প্রসার ঘটায়।", author: "সত্য নাদেলা" },
  { quote: "রোবোটিক্স ও কৃত্রিম বুদ্ধিমত্তা আমাদের ভবিষ্যত গড়ে তুলবে।", author: "সুব্রত পাল" },
  { quote: "সাইবার নিরাপত্তা শুধু প্রযুক্তির বিষয় নয়, এটা মানসিকতার বিষয়ও।", author: "বিশেষজ্ঞ" },
  { quote: "বিগ ডেটা হলো নতুন তেল - এটা অর্থনীতি চালায়।", author: "পিটার সোনেনফেল্ড" },
  { quote: "ক্লাউড কম্পিউটিং ব্যবসাকে সীমাহীন সম্ভাবনায় পরিণত করে।", author: "শোষিতা ঘোষ" },
  { quote: "মোবাইল ফোন আমাদের জীবনের সাথে এতটাই মিশে গেছে যে এটা আলাদা করা অসম্ভব।", author: "প্রযুক্তিবিদ" },
  { quote: "ইন্টারনেট অব থিংস সবকিছুকে সংযুক্ত করছে - ঘর, গাড়ি, শহর।", author: "আইওটি বিশেষজ্ঞ" },
  { quote: "ব্লকচেইন প্রযুক্তি বিশ্বাসযোগ্যতা পুনঃসংজ্ঞায়িত করছে।", author: "ক্রিপ্টোগ্রাফি বিশেষজ্ঞ" },
  { quote: "মেশিন লার্নিং অ্যালগরিদম ডেটা থেকে শিখে নিজেকে উন্নত করে।", author: "ডেটা সায়েন্টিস্ট" },
  { quote: "কোয়ান্টাম কম্পিউটিং প্রচলিত কম্পিউটারের সীমাবদ্ধতা দূর করবে।", author: "কোয়ান্টাম পদার্থবিদ" },
  { quote: "ভার্চুয়াল রিয়েলিটি অভিজ্ঞতার নতুন দিগন্ত খুলে দিচ্ছে।", author: "এভিআর বিশেষজ্ঞ" },
  { quote: "অগমেন্টেড রিয়েলিটি বাস্তব ও ডিজিটাল জগৎকে মিশিয়ে দিচ্ছে।", author: "মিক্সড রিয়েলিটি গবেষক" },
  { quote: "৫জি নেটওয়ার্ক দ্রুত গতির যোগাযোগের নতুন যুগ শুরু করেছে।", author: "টেলিকম বিশেষজ্ঞ" },
  { quote: "এআই জেনারেটিভ মডেল সৃজনশীলতার সীমানা ঠেলে দিচ্ছে।", author: "এআই গবেষক" },
  { quote: "ডিজিটাল ট্রান্সফর্মেশন প্রতিটি সংগঠনের জন্য অপরিহার্য হয়ে উঠেছে।", author: "ডিজিটাল স্ট্র্যাটেজিস্ট" },
  { quote: "সফটওয়্যার খায় না, পরে না - কিন্তু সব কিছু চালায়।", author: "সফটওয়্যার প্রকৌশলী" },
  { quote: "ওপেন সোর্স আন্দোলন প্রযুক্তির গণতন্ত্রীকরণ করেছে।", author: "লিনাক্স প্রতিষ্ঠাতা" },
  { quote: "এপিআই অ্যাপ্লিকেশনের মধ্যে সেতু হিসেবে কাজ করে।", author: "ব্যাকএন্ড ডেভেলপার" },
  { quote: "রেসপন্সিভ ডিজাইন মোবাইল ফার্স্ট ওয়েব তৈরি করেছে।", author: "ফ্রন্টএন্ড ডিজাইনার" },
  { quote: "ডিভঅপস অপারেশনকে স্বয়ংক্রিয় করে দ্রুত ডেপ্লয়মেন্ট নিশ্চিত করে।", author: "দেভঅপস ইঞ্জিনিয়ার" },
  { quote: "এসইও প্রযুক্তি ওয়েবসাইটকে সার্চ ইঞ্জিনে দৃশ্যমান করে।", author: "ডিজিটাল মার্কেটার" },
  { quote: "গ্রাফিক্স ইউনিট গেম ও ভিজ্যুয়ালাইজেশনকে বাস্তবসম্মত করে তোলে।", author: "গেম ডেভেলপার" },
  { quote: "স্টোরেজ প্রযুক্তি ক্রমাগত উন্নতির পথে এগিয়ে চলেছে।", author: "স্টোরেজ আর্কিটেক্ট" },
  { quote: "নেটওয়ার্ক প্রোটোকল ইন্টারনেটের মেরুদণ্ড।", author: "নেটওয়ার্ক ইঞ্জিনিয়ার" },
  { quote: "সাইবার আক্রমণ ডিজিটাল যুগের সবচেয়ে বড় হুমকি।", author: "সাইবার সিকিউরিটি অ্যানালিস্ট" },
  { quote: "ক্লাউড নেটিভ আর্কিটেকচার মাইক্রোসার্ভিসেসের উপর ভিত্তি করে।", author: "ক্লাউড আর্কিটেক্ট" },
  { quote: "এআই এথিক্স প্রযুক্তির দায়িত্বশীল ব্যবহার নিশ্চিত করে।", author: "এআই গভর্ন্যান্স বিশেষজ্ঞ" },
  { quote: "ডেটা প্রাইভেসি ডিজিটাল যুগের মৌলিক অধিকার।", author: "প্রাইভেসি অ্যাক্টিভিস্ট" },
  { quote: "এজ কম্পিউটিং প্রসেসিংকে ডেটা উৎসের কাছে নিয়ে যাচ্ছে।", author: "এজ কম্পিউটিং গবেষক" },
  { quote: "ফেসিয়াল রিকগনিশন বায়োমেট্রিক্সের একটি শাখা।", author: "কম্পিউটার ভিশন বিশেষজ্ঞ" },
  { quote: "ন্যাচারাল ল্যাংগুয়েজ প্রসেসিং মানুষ ও মেশিনের যোগাযোগ সহজ করে।", author: "এনএলপি গবেষক" },
  { quote: "অটোমেশন কাজের গতি ও নির্ভুলতা বাড়ায়।", author: "রোবোটিক্স ইঞ্জিনিয়ার" },
  { quote: "ডিজিটাল টুইন বাস্তব বিশ্বের প্রতিফলন ডিজিটাল জগতে তৈরি করে।", author: "সিমুলেশন বিশেষজ্ঞ" },
  { quote: "লিডারবোর্ড ডেটা সাইকোলজি ব্যবহারকারীর আচরণ বোঝার হাতিয়ার।", author: "ইউএক্স গবেষক" },
  { quote: "ইউআই ডিজাইন ব্যবহারকারীর অভিজ্ঞতার প্রথম ছাপ তৈরি করে।", author: "ইউআই ডিজাইনার" },
  { quote: "কন্টেইনারাইজেশন অ্যাপ্লিকেশনকে পোর্টেবল ও স্কেলেবল করে।", author: "কন্টেইনার টেকনোলজি বিশেষজ্ঞ" },
  { quote: "সার্ভারলেস কম্পিউটিং ইনফ্রাস্ট্রাকচার ম্যানেজমেন্ট সরল করে।", author: "ক্লাউড প্রোভাইডার" },
  { quote: "এআই অ্যাসিস্ট্যান্ট প্রতিদিনের কাজে সাহায্য করে।", author: "ভার্চুয়াল অ্যাসিস্ট্যান্ট বিশেষজ্ঞ" },
  { quote: "ডিজিটাল পেমেন্ট সিস্টেম নগদ লেনদেনকে সহজ করেছে।", author: "ফিনটেক বিশেষজ্ঞ" },
  { quote: "ইলেকট্রনিক হেলথ রেকর্ড রোগীর তথ্য সংরক্ষণে বিপ্লব ঘটাচ্ছে।", author: "ই-হেলথ স্টেকহোল্ডার" },
  { quote: "স্মার্ট সিটি প্রযুক্তি দ্বারা পরিচালিত শহর।", author: "স্মার্ট সিটি পরিকল্পনাবিদ" },
  { quote: "ই-লার্নিং শিক্ষার সীমানা বিস্তৃত করেছে।", author: "এডুটেক বিশেষজ্ঞ" },
  { quote: "ডিজিটাল লিটারেসি আধুনিক যুগের অপরিহার্য দক্ষতা।", author: "শিক্ষাবিদ" },
  { quote: "সোশ্যাল মিডিয়া অ্যালগরিদম কন্টেন্ট ডেলিভারি নির্ধারণ করে।", author: "সোশ্যাল মিডিয়া অ্যানালিস্ট" },
  { quote: "ভিডিও কনফারেন্সিং দূরত্বকে কমিয়ে এনেছে।", author: "কমিউনিকেশন টেকনোলজিস্ট" },
  { quote: "ডিজিটাল সাইনেজ কাগজের নথিপত্র প্রতিস্থাপন করছে।", author: "ই-গভর্ন্যান্স বিশেষজ্ঞ" },
  { quote: "রোবোটিক প্রসেস অটোমেশন ব্যবসায়িক প্রক্রিয়া স্বয়ংক্রিয় করে।", author: "আরপিএ ডেভেলপার" },
  { quote: "ডিপ লার্নিং স্নায়ুতন্ত্রের অনুকরণে শেখে।", author: "ডিপ লার্নিং গবেষক" },

] as const;

const DAILY_QUOTE_THEMES_BN = [
  'শিক্ষা',
  'দায়িত্ব',
  'সততা',
  'সময়',
  'উদ্ভাবন',
  'পরিকল্পনা',
  'শৃঙ্খলা',
  'সহযোগিতা',
  'সাহস',
  'সেবা',
  'পরিবর্তন',
  'প্রযুক্তি',
  'মানবিকতা',
  'অভ্যাস',
  'স্বচ্ছতা',
  'নিরাপত্তা',
  'জ্ঞান',
  'মনোযোগ',
  'উন্নয়ন',
  'নেতৃত্ব',
] as const;

const DAILY_QUOTE_ACTIONS_BN = [
  'ছোট পদক্ষেপ দিয়েই বড় সাফল্যের পথ খুলে দেয়',
  'দৈনন্দিন কাজকে অর্থবহ ও ফলপ্রসূ করে',
  'দলকে একসাথে এগিয়ে যাওয়ার শক্তি দেয়',
  'সঠিক সিদ্ধান্ত নেওয়ার ভিত্তি তৈরি করে',
  'কঠিন সময়েও স্থির থাকার সাহস জোগায়',
  'ভবিষ্যৎকে আরও প্রস্তুত ও কার্যকর করে',
  'কাজের মান উন্নত করার দরজা খুলে দেয়',
  'বিশ্বাস ও আস্থার সম্পর্ক গড়ে তোলে',
  'দায়িত্বকে কেবল কাজ নয়, মূল্যবোধে পরিণত করে',
  'প্রতিষ্ঠানের সক্ষমতাকে নতুন উচ্চতায় পৌঁছে দেয়',
] as const;

const DAILY_QUOTE_IMPACTS_BN = [
  'যখন মানুষ ইচ্ছাকে নিয়মিত চর্চায় রূপ দেয়',
  'যখন লক্ষ্য পরিষ্কার থাকে এবং কাজ ধারাবাহিক হয়',
  'যখন প্রযুক্তি মানুষের প্রয়োজনকে সম্মান করে',
  'যখন প্রতিটি সিদ্ধান্তে জবাবদিহিতা থাকে',
  'যখন সময়কে গুরুত্ব দিয়ে ব্যবহার করা হয়',
  'যখন অভিজ্ঞতা থেকে শিক্ষা নেওয়া হয়',
  'যখন সমাধানকে সমস্যা থেকে বড় করে দেখা হয়',
  'যখন সবার অবদানকে সমান মর্যাদা দেওয়া হয়',
  'যখন সেবার মানকে প্রতিদিন একটু করে বাড়ানো হয়',
  'যখন উন্নয়নকে দীর্ঘমেয়াদি প্রতিশ্রুতি হিসেবে ধরা হয়',
] as const;

const DAILY_QUOTE_AUTHORS_BN = [
  'দৈনিক প্রযুক্তি ভাবনা',
  'দৈনিক প্রেরণা',
  'সেবার দর্শন',
  'কর্মপ্রেরণা',
  'ডিজিটাল চিন্তা',
  'দলগত অনুপ্রেরণা',
  'উন্নয়ন বার্তা',
  'প্রতিদিনের বাণী',
] as const;

const DAILY_TECH_QUOTES_BN: DailyQuote[] = (() => {
  const compiledQuotes: DailyQuote[] = [...DAILY_TECH_QUOTES_BN_SEED];

  for (const theme of DAILY_QUOTE_THEMES_BN) {
    for (const action of DAILY_QUOTE_ACTIONS_BN) {
      for (const impact of DAILY_QUOTE_IMPACTS_BN) {
        compiledQuotes.push({
          quote: `${theme} ${action}, ${impact}।`,
          author: DAILY_QUOTE_AUTHORS_BN[compiledQuotes.length % DAILY_QUOTE_AUTHORS_BN.length],
        });
        if (compiledQuotes.length >= 365) {
          return compiledQuotes.slice(0, 365);
        }
      }
    }
  }

  return compiledQuotes.slice(0, 365);
})();

function getDayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

function getDailyTechQuote(settings: AppSystemSettings, date = new Date()) {
  const sourceQuotes = settings.dailyQuotes.length > 0 ? settings.dailyQuotes : DAILY_TECH_QUOTES_BN;
  const dayIndex = (getDayOfYear(date) - 1) % sourceQuotes.length;
  return sourceQuotes[(dayIndex + sourceQuotes.length) % sourceQuotes.length];
}

function buildDefaultSystemSettings(): AppSystemSettings {
  return {
    emailNotifications: true,
    maintenanceMode: false,
    dailyQuotesEnabled: true,
    dailyQuotes: [...DAILY_TECH_QUOTES_BN],
    requestTypes: [...SERVICE_REQUEST_TYPES],
    categories: SERVICE_CATEGORIES.map((category) => ({
      id: category,
      key: category,
      label: SERVICE_CATEGORY_LABELS[category],
      items: [...SERVICE_ITEMS_BY_CATEGORY[category]],
      officerRole: Object.entries(DESK_OFFICER_CATEGORY_MAP).find(([, value]) => value === category)?.[0] || '',
      active: true,
    })),
    quickLinks: [
      {
        id: 'telephone-index-2025',
        title: 'টেলিফোন ইনডেক্স ২০২৫',
        description: 'অভ্যন্তরীণ টেলিফোন নম্বর তালিকা দেখুন এবং browser PDF search ব্যবহার করে দ্রুত খুঁজুন।',
        url: '/telephone-index-2025.pdf',
      },
    ],
    formBranding: {
      logoUrl: '/UGC_Logo_1.png',
      headerTitleBn: 'à¦¬à¦¾à¦‚à¦²à¦¾à¦¦à§‡à¦¶ à¦¬à¦¿à¦¶à§à¦¬à¦¬à¦¿à¦¦à§à¦¯à¦¾à¦²à§Ÿ à¦®à¦žà§à¦œà§à¦°à§€ à¦•à¦®à¦¿à¦¶à¦¨',
      headerTitleEn: 'University Grants Commission of Bangladesh',
      headerAddress: 'à¦†à¦—à¦¾à¦°à¦—à¦¾à¦à¦“, à¦¶à§‡à¦°à§‡ à¦¬à¦¾à¦‚à¦²à¦¾ à¦¨à¦—à¦°, à¦¢à¦¾à¦•à¦¾-à§§à§¨à§¦à§­',
      headerWebsite: 'website: www.ugc.gov.bd',
      formTitle: 'à¦†à¦‡à¦Ÿà¦¿ à¦¸à§‡à¦¬à¦¾ à¦«à¦°à¦®',
    },
  };
}

function normalizeSystemSettings(parsed?: Partial<AppSystemSettings>): AppSystemSettings {
  const defaults = buildDefaultSystemSettings();
  return {
    emailNotifications: parsed?.emailNotifications ?? defaults.emailNotifications,
    maintenanceMode: parsed?.maintenanceMode ?? defaults.maintenanceMode,
    dailyQuotesEnabled: parsed?.dailyQuotesEnabled ?? defaults.dailyQuotesEnabled,
    dailyQuotes: Array.isArray(parsed?.dailyQuotes) && parsed.dailyQuotes.length > 0
      ? parsed.dailyQuotes.map((quote, index) => ({
          quote: typeof quote?.quote === 'string' ? quote.quote.trim() : '',
          author: typeof quote?.author === 'string' && quote.author.trim() ? quote.author.trim() : `দৈনিক বাণী ${index + 1}`,
        })).filter((quote) => quote.quote)
      : defaults.dailyQuotes,
    requestTypes: Array.isArray(parsed?.requestTypes) && parsed.requestTypes.length > 0 ? parsed.requestTypes : defaults.requestTypes,
    categories: Array.isArray(parsed?.categories) && parsed.categories.length > 0
      ? parsed.categories.map((category, index) => ({
          id: category.id || `custom-${index}`,
          key: category.key || '',
          label: category.label || category.key || `ক্যাটাগরি ${index + 1}`,
          items: Array.isArray(category.items) ? category.items : [],
          officerRole: category.officerRole || '',
          active: category.active ?? true,
        }))
      : defaults.categories,
    quickLinks: Array.isArray(parsed?.quickLinks)
      ? parsed.quickLinks.map((link, index) => ({
          id: link.id || `quick-link-${index}`,
          title: link.title || `দ্রুত লিংক ${index + 1}`,
          description: link.description || '',
          url: link.url || '',
        })).filter((link) => link.title.trim() || link.url.trim())
      : defaults.quickLinks,
    formBranding: {
      logoUrl: parsed?.formBranding?.logoUrl?.trim() || defaults.formBranding.logoUrl,
      headerTitleBn: parsed?.formBranding?.headerTitleBn?.trim() || defaults.formBranding.headerTitleBn,
      headerTitleEn: parsed?.formBranding?.headerTitleEn?.trim() || defaults.formBranding.headerTitleEn,
      headerAddress: parsed?.formBranding?.headerAddress?.trim() || defaults.formBranding.headerAddress,
      headerWebsite: parsed?.formBranding?.headerWebsite?.trim() || defaults.formBranding.headerWebsite,
      formTitle: parsed?.formBranding?.formTitle?.trim() || defaults.formBranding.formTitle,
    },
  };
}

function readSystemSettings(): AppSystemSettings {
  if (typeof window === 'undefined') {
    return buildDefaultSystemSettings();
  }

  try {
    const saved = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!saved) return buildDefaultSystemSettings();
    return normalizeSystemSettings(JSON.parse(saved) as Partial<AppSystemSettings>);
  } catch (error) {
    console.error('Error loading system settings:', error);
    return buildDefaultSystemSettings();
  }
}

function useSystemSettings() {
  const [settings, setSettings] = useState<AppSystemSettings>(() => readSystemSettings());

  useEffect(() => {
    const syncSettings = () => setSettings(readSystemSettings());
    window.addEventListener('storage', syncSettings);
    window.addEventListener(SETTINGS_UPDATED_EVENT, syncSettings);
    return () => {
      window.removeEventListener('storage', syncSettings);
      window.removeEventListener(SETTINGS_UPDATED_EVENT, syncSettings);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/system-settings')
      .then((res) => res.ok ? res.json() : null)
      .then((serverSettings) => {
        if (!serverSettings || cancelled) return;
        const normalized = normalizeSystemSettings(serverSettings as Partial<AppSystemSettings>);
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
        window.dispatchEvent(new Event(SETTINGS_UPDATED_EVENT));
        setSettings(normalized);
      })
      .catch(() => {
        // Keep local settings when server copy is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return settings;
}

function getActiveManagedCategories(settings: AppSystemSettings) {
  return settings.categories.filter((category) => category.active && category.key.trim());
}

function getOfficerCategoryMap(settings: AppSystemSettings) {
  return getActiveManagedCategories(settings).reduce<Record<string, string>>((acc, category) => {
    if (category.officerRole) {
      acc[category.officerRole] = category.key;
    }
    return acc;
  }, {});
}

function getOfficerRoleLabelMap(settings: AppSystemSettings) {
  return getActiveManagedCategories(settings).reduce<Record<string, string>>((acc, category) => {
    if (category.officerRole) {
      acc[category.officerRole] = DEFAULT_OFFICER_OPTIONS.find((option) => option.value === category.officerRole)?.label || category.officerRole;
    }
    return acc;
  }, {});
}

function getServiceProviderRoleForOfficerRole(role: string) {
  return role.replace('desk_officer_', 'service_provider_');
}

function hasServiceProviderFeatureForRole(permissions: string[] = [], officerRole: string) {
  const providerFeature = getServiceProviderRoleForOfficerRole(officerRole);
  return SERVICE_PROVIDER_FEATURES.includes(providerFeature as typeof SERVICE_PROVIDER_FEATURES[number]) && permissions.includes(providerFeature);
}

function getProviderOfficerRolesFromPermissions(
  permissions: string[] = [],
  settings: AppSystemSettings,
  scopedRoles?: string[],
) {
  const officerCategoryMap = getOfficerCategoryMap(settings);
  const candidateRoles = scopedRoles && scopedRoles.length > 0 ? scopedRoles : Object.keys(officerCategoryMap);
  return candidateRoles.filter((role) => hasServiceProviderFeatureForRole(permissions, role));
}

function getServiceProviderRoleLabelMap(settings: AppSystemSettings) {
  const providerLabels: Record<string, string> = {
    service_provider_hardware: 'সেবা প্রদানকারী (হার্ডওয়্যার)',
    service_provider_network: 'সেবা প্রদানকারী (নেটওয়ার্ক)',
    service_provider_software: 'সেবা প্রদানকারী (সফটওয়্যার)',
    service_provider_maintenance: 'সেবা প্রদানকারী (মেইনটেন্যান্স)',
  };

  return getActiveManagedCategories(settings).reduce<Record<string, string>>((acc, category) => {
    if (category.officerRole) {
      const providerRole = getServiceProviderRoleForOfficerRole(category.officerRole);
      acc[providerRole] = providerLabels[providerRole] || providerRole;
    }
    return acc;
  }, {});
}

function getRelevantOfficerRolesForServiceType(serviceType: string, settings: AppSystemSettings) {
  const officerCategoryMap = getOfficerCategoryMap(settings);
  return Object.keys(officerCategoryMap).filter((role) => serviceType.includes(officerCategoryMap[role]));
}

interface UserListItem {
  id: number;
  name: string;
  email: string;
  password?: string;
  name_bn: string;
  role: Role;
  division?: string;
  designation?: string;
  mobile?: string;
  permissions?: string[];
  extra_permissions?: string[];
  denied_permissions?: string[];
  status: 'Active' | 'Inactive';
}

type DashboardTimeframe = 'all' | 'monthly' | 'yearly' | 'custom';

function parseSubmissionDate(value: string) {
  const [day, month, year] = value.split('/').map(Number);
  if (!day || !month || !year) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

interface TelephoneDirectoryEntry {
  id: number;
  name: string;
  designation?: string | null;
  division?: string | null;
  intercom?: string | null;
  mobile?: string | null;
  ip_number?: string | null;
  email?: string | null;
  room_no?: string | null;
  notes?: string | null;
  status: 'Active' | 'Inactive';
}

function matchesTextQuery(query: string, ...values: Array<string | number | null | undefined>) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return values.some((value) => `${value ?? ''}`.toLowerCase().includes(normalized));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function toCsvCell(value: string | null | undefined) {
  const normalized = `${value ?? ''}`;
  const escaped = normalized.replace(/"/g, '""');
  return `"${escaped}"`;
}

function filterApplicationsByTimeframe(applications: Application[], timeframe: DashboardTimeframe, customStart: string, customEnd: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const customStartDate = customStart ? new Date(`${customStart}T00:00:00`) : null;
  const customEndDate = customEnd ? new Date(`${customEnd}T23:59:59`) : null;

  return applications.filter((app) => {
    const submittedAt = parseSubmissionDate(app.submission_date);
    if (!submittedAt) return timeframe === 'all';

    if (timeframe === 'monthly') {
      return submittedAt >= startOfMonth;
    }

    if (timeframe === 'yearly') {
      return submittedAt >= startOfYear;
    }

    if (timeframe === 'custom') {
      if (customStartDate && submittedAt < customStartDate) return false;
      if (customEndDate && submittedAt > customEndDate) return false;
      return true;
    }

    return true;
  });
}

export default function App() {
  const systemSettings = useSystemSettings();
  const [user, setUser] = useState<UserData | null>(null);
  const [systemSettingsReady, setSystemSettingsReady] = useState(false);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const response = await fetch('/api/session');
        if (!response.ok) {
          setUser(null);
          return;
        }

        const data = await response.json();
        if (data.success) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        setUser(null);
      }
    };

    restoreSession();
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/system-settings')
      .then(() => {
        if (!cancelled) {
          setSystemSettingsReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSystemSettingsReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);
  const [currentView, setCurrentView] = useState<'dashboard' | 'application_form' | 'user_management' | 'division_management' | 'role_management' | 'my_applications' | 'all_applications' | 'system_settings' | 'api_settings' | 'profile' | 'received_applications' | 'forwarded_applications' | 'rejected_applications' | 'assigned_applications' | 'reports' | 'telephone_directory' | 'audit_logs'>('dashboard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const userMetaLine = [user?.designation, user?.division].filter(Boolean).join(' | ');
  const hasPermission = (permission: string) => !!user?.permissions?.includes(permission);
  const isMaintenanceMode = systemSettings.maintenanceMode;
  const isAdminUser = user?.role === 'admin';
  const isBlockedByMaintenance = !!user && isMaintenanceMode && !isAdminUser;

  const canAccessView = (view: typeof currentView) => {
    switch (view) {
      case 'dashboard':
        return hasPermission('dashboard');
      case 'application_form':
        return hasPermission('application_form');
      case 'my_applications':
        return hasPermission('application_history');
      case 'all_applications':
        return hasPermission('all_applications');
      case 'received_applications':
        return hasPermission('received_applications');
      case 'forwarded_applications':
        return hasPermission('forwarded_applications');
      case 'rejected_applications':
        return hasPermission('rejected_applications');
      case 'assigned_applications':
        return hasPermission('assigned_applications');
      case 'user_management':
        return hasPermission('user_management');
      case 'division_management':
        return hasPermission('division_management');
      case 'role_management':
        return hasPermission('role_management');
      case 'system_settings':
        return hasPermission('settings');
      case 'api_settings':
        return hasPermission('settings');
      case 'profile':
        return hasPermission('profile');
      case 'reports':
        return hasPermission('reports');
      case 'telephone_directory':
        return hasPermission('telephone_directory');
      case 'audit_logs':
        return user?.role === 'admin';
      default:
        return true;
    }
  };

  useEffect(() => {
    if (user && !canAccessView(currentView)) {
      setCurrentView('dashboard');
    }
  }, [user, currentView]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (data.success) {
        setCurrentView('dashboard');
        setUser(data.user);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('সার্ভার ত্রুটি। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setUser(null);
      setCurrentView('dashboard');
      setEmail('');
      setPassword('');
      setShowPassword(false);
    }
  };

  const showDailyQuotes = systemSettings.dailyQuotesEnabled && systemSettings.dailyQuotes.length > 0;
  const dailyQuote = showDailyQuotes ? getDailyTechQuote(systemSettings) : null;

  if (window.location.pathname.startsWith('/shared/reports')) {
    return <SharedReportsPage />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e8f0ff_0%,_#f7f9fc_48%,_#eef3fb_100%)] font-sans p-4">
        <div className={`mx-auto flex min-h-screen max-w-7xl items-center ${showDailyQuotes ? '' : 'justify-center'}`}>
          <div className={`w-full items-center gap-8 xl:gap-12 ${showDailyQuotes ? 'grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)]' : 'flex justify-center'}`}>
            {showDailyQuotes && dailyQuote && <div className="hidden lg:block">
              <div className="relative overflow-hidden rounded-[32px] border border-blue-100/80 bg-white/85 p-10 shadow-[0_24px_80px_rgba(26,58,107,0.10)] backdrop-blur-sm">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(26,58,107,0.10),_transparent_38%)]" />
                <div className="relative space-y-4">
                  <div className="space-y-4 [&>p:first-child]:hidden">
                    <p className="text-sm font-semibold text-blue-700">আজকের বাংলা বাণী</p>
                    <blockquote className="max-w-3xl text-[30px] font-bold leading-[1.55] text-[#16335f] xl:text-[38px]">
                      “{dailyQuote.quote}”
                    </blockquote>
                    <p className="text-base font-semibold text-gray-500">{dailyQuote.author}</p>
                  </div>
                  <div className="hidden grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
                      <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-gray-400">দিন</div>
                      <div className="mt-2 text-3xl font-black text-[#1a3a6b]">{getDayOfYear(new Date())}</div>
                    </div>
                    <div className="rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
                      <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-gray-400">মোট বাণী</div>
                      <div className="mt-2 text-3xl font-black text-[#1a3a6b]">{DAILY_TECH_QUOTES_BN.length}</div>
                    </div>
                    <div className="rounded-2xl border border-white bg-white/90 p-4 shadow-sm">
                      <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-gray-400">রোটেশন</div>
                      <div className="mt-2 text-lg font-black text-[#1a3a6b]">৩৬৫ দিনে ৩৬৫ বাণী</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>}

            <div className={`max-w-md w-full bg-white rounded-xl shadow-2xl overflow-hidden mx-auto ${showDailyQuotes ? 'lg:ml-auto lg:mr-28 xl:mr-40' : ''}`}>
          <div className="bg-[#1a3a6b] p-8 text-center">
            <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg p-3">
              <img src="/UGC_Logo_1.png" alt="UGC Logo" className="max-w-full max-h-full object-contain" />
            </div>
            <h1 className="text-white text-2xl font-bold font-[Nikosh]">বাংলাদেশ বিশ্ববিদ্যালয় মঞ্জুরী কমিশন</h1>
            <p className="text-blue-100 text-sm mt-1">আইটি সেবা অনুরোধ সিস্টেম (Preview)</p>
          </div>
          
          <div className="p-8">
            {isMaintenanceMode && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
                <p className="text-sm font-bold">সিস্টেম রক্ষণাবেক্ষণ চলছে</p>
                <p className="mt-1 text-xs">এই সময়ে সাধারণ ব্যবহারকারীদের প্রবেশ সীমিত থাকতে পারে।</p>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 text-sm flex items-center">
                <ShieldCheck className="w-5 h-5 mr-2" />
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">ইমেইল (Email)</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                    className="pl-10 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">পাসওয়ার্ড (Password)</label>
                <div className="relative">
                  <LogIn className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                    className="pl-10 pr-24 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-700 hover:text-blue-900"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-bold text-white bg-[#1a3a6b] hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50"
              >
                {loading ? 'প্রসেসিং...' : 'লগইন করুন'}
              </button>
            </form>
            
            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-500">
                পাসওয়ার্ড ভুলে গেলে আইসিটি বিভাগের সাথে যোগাযোগ করুন।
              </p>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
    );
  }

  if (!systemSettingsReady) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans p-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-[#1a3a6b]"></div>
          <h2 className="mt-4 text-lg font-bold text-[#1a3a6b]">সিস্টেম যাচাই করা হচ্ছে</h2>
          <p className="mt-2 text-sm text-gray-500">অনুগ্রহ করে অপেক্ষা করুন...</p>
        </div>
      </div>
    );
  }

  if (user.must_change_password) {
    return <PasswordChangeRequired user={user} onUpdate={setUser} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      {/* Navigation */}
      <nav className="bg-[#1a3a6b] text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mr-3 shadow-md p-1.5">
                  <img src="/UGC_Logo_1.png" alt="UGC Logo" className="max-w-full max-h-full object-contain" />
                </div>
                <div className="block">
                  <h1 className="font-bold text-sm leading-tight font-[Nikosh]">বাংলাদেশ বিশ্ববিদ্যালয় মঞ্জুরী কমিশন</h1>
                  <p className="text-[10px] text-blue-200">IT Service Request System</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {isMaintenanceMode && (
                <div className={`hidden sm:inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold ${isAdminUser ? 'bg-amber-400/20 text-amber-100 ring-1 ring-amber-200/30' : 'bg-red-500/20 text-red-100 ring-1 ring-red-200/30'}`}>
                  {isAdminUser ? 'Maintenance Mode Active' : 'Maintenance Mode'}
                </div>
              )}
              <div className="hidden sm:flex flex-col items-end mr-2">
                <span className="text-xs font-semibold">স্বাগতম, {user.name_bn}</span>
                <span className="text-[10px] text-blue-200">{userMetaLine || 'তথ্য সংযোজন করুন'}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 p-2 rounded-lg text-white transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">লগআউট</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {isMaintenanceMode && (
        <div className={`border-b px-4 py-3 text-sm ${isAdminUser ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-red-200 bg-red-50 text-red-800'}`}>
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div>
              <p className="font-bold">{isAdminUser ? 'রক্ষণাবেক্ষণ মোড চালু আছে' : 'সিস্টেম রক্ষণাবেক্ষণ চলছে'}</p>
              <p className="text-xs">{isAdminUser ? 'আপনি অ্যাডমিন হিসেবে কাজ চালিয়ে যেতে পারবেন। অন্যান্য ব্যবহারকারীদের অ্যাক্সেস সাময়িকভাবে সীমিত থাকবে।' : 'অনুগ্রহ করে কিছুক্ষণ পরে আবার চেষ্টা করুন অথবা আইসিটি বিভাগের সাথে যোগাযোগ করুন।'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 flex-1 w-full">
        {isBlockedByMaintenance ? (
          <div className="mx-auto max-w-3xl">
            <div className="rounded-[28px] border border-red-100 bg-white p-8 shadow-sm">
              <div className="rounded-2xl bg-gradient-to-br from-red-50 via-white to-amber-50 p-8 ring-1 ring-red-100">
                <div className="inline-flex rounded-full bg-red-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-red-700">
                  Maintenance Mode
                </div>
                <h2 className="mt-4 text-3xl font-bold text-[#1a3a6b]">সিস্টেম সাময়িকভাবে রক্ষণাবেক্ষণে আছে</h2>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  প্রিয় {user.name_bn || user.name}, বর্তমানে সিস্টেমে আপডেট ও রক্ষণাবেক্ষণের কাজ চলছে। তাই আপনার জন্য আবেদন, রিপোর্ট ও অন্যান্য মডিউল সাময়িকভাবে বন্ধ রাখা হয়েছে।
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-gray-100 bg-white p-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">অ্যাক্সেস</div>
                    <div className="mt-2 text-sm font-bold text-gray-800">Restricted During Maintenance</div>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-white p-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">সহায়তা</div>
                    <div className="mt-2 text-sm font-bold text-gray-800">আইসিটি বিভাগ / অ্যাডমিন</div>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                  >
                    আবার চেষ্টা করুন
                  </button>
                  <button
                    onClick={handleLogout}
                    className="rounded-xl bg-[#1a3a6b] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800"
                  >
                    লগআউট
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:w-64 shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 mb-2">প্রধান মেনু</p>
              
              {hasPermission('dashboard') && (
                <SidebarLink 
                  icon={<LayoutDashboard />} 
                  label={user.role === 'admin' ? "অ্যাডমিন ড্যাশবোর্ড" : "ড্যাশবোর্ড"} 
                  active={currentView === 'dashboard'} 
                  onClick={() => setCurrentView('dashboard')} 
                />
              )}
              {hasPermission('application_form') && (
                <SidebarLink icon={<PlusCircle />} label="আবেদন ফর্ম" active={currentView === 'application_form'} onClick={() => setCurrentView('application_form')} />
              )}
              {hasPermission('application_history') && (
            <SidebarLink 
              icon={<FileText />} 
              label="আবেদনের ইতিহাস" 
              active={currentView === 'my_applications'} 
              onClick={() => setCurrentView('my_applications')} 
            />
          )}
          {hasPermission('all_applications') && (
            <SidebarLink 
              icon={<FileText />} 
              label="সকল আবেদন" 
              active={currentView === 'all_applications'} 
              onClick={() => setCurrentView('all_applications')} 
            />
          )}
              {hasPermission('received_applications') && (
                <SidebarLink icon={<FileText />} label="আগত আবেদনসমূহ" active={currentView === 'received_applications'} onClick={() => setCurrentView('received_applications')} />
              )}
              {hasPermission('forwarded_applications') && (
                <SidebarLink icon={<Send />} label="প্রেরিত আবেদনসমূহ" active={currentView === 'forwarded_applications'} onClick={() => setCurrentView('forwarded_applications')} />
              )}
              {hasPermission('rejected_applications') && (
                <SidebarLink icon={<Trash2 />} label="বাতিলকৃত আবেদনসমূহ" active={currentView === 'rejected_applications'} onClick={() => setCurrentView('rejected_applications')} />
              )}
              {hasPermission('assigned_applications') && (
                <SidebarLink icon={<ShieldCheck />} label="অ্যাসাইনকৃত আবেদন" active={currentView === 'assigned_applications'} onClick={() => setCurrentView('assigned_applications')} />
              )}
              {hasPermission('user_management') && (
                <SidebarLink icon={<Users />} label="ইউজার ম্যানেজমেন্ট" active={currentView === 'user_management'} onClick={() => setCurrentView('user_management')} />
              )}
              {hasPermission('division_management') && (
                <SidebarLink icon={<Briefcase />} label="বিভাগ ম্যানেজমেন্ট" active={currentView === 'division_management'} onClick={() => setCurrentView('division_management')} />
              )}
              {hasPermission('role_management') && (
                <SidebarLink icon={<ShieldCheck />} label="রোল ম্যানেজমেন্ট" active={currentView === 'role_management'} onClick={() => setCurrentView('role_management')} />
              )}
              {hasPermission('reports') && (
                <SidebarLink icon={<FileText />} label="রিপোর্ট" active={currentView === 'reports'} onClick={() => setCurrentView('reports')} />
              )}
              {hasPermission('telephone_directory') && (
                <SidebarLink icon={<Phone />} label="টেলিফোন ডিরেক্টরি" active={currentView === 'telephone_directory'} onClick={() => setCurrentView('telephone_directory')} />
              )}
          {hasPermission('settings') && (
            <SidebarLink icon={<Settings />} label="সিস্টেম সেটিংস" active={currentView === 'system_settings'} onClick={() => setCurrentView('system_settings')} />
          )}
          {hasPermission('settings') && (
            <SidebarLink icon={<Link2 />} label="API Settings" active={currentView === 'api_settings'} onClick={() => setCurrentView('api_settings')} />
          )}
          {user.role === 'admin' && (
            <SidebarLink icon={<FileText />} label="লগ বই" active={currentView === 'audit_logs'} onClick={() => setCurrentView('audit_logs')} />
          )}
              {hasPermission('profile') && (
                <SidebarLink icon={<User />} label="প্রোফাইল" active={currentView === 'profile'} onClick={() => setCurrentView('profile')} />
              )}
            </div>

            {user.role === 'employee' && currentView === 'dashboard' && (
              <div className="mt-4">
                <EmployeeTicTacToe userEmail={user.email} />
              </div>
            )}
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-lg font-bold text-gray-800">
                  {currentView === 'application_form' ? 'আইটি সেবা ফরম' : 
                   currentView === 'my_applications' ? 'আবেদনের ইতিহাস' :
                   currentView === 'all_applications' ? 'সকল আবেদন' :
                   currentView === 'received_applications' ? 'আগত আবেদনসমূহ' :
                   currentView === 'forwarded_applications' ? 'প্রেরিত আবেদনসমূহ' :
                   currentView === 'rejected_applications' ? 'বাতিলকৃত আবেদনসমূহ' :
                   currentView === 'assigned_applications' ? 'অ্যাসাইনকৃত আবেদন' :
                   currentView === 'reports' ? 'রিপোর্ট' :
          currentView === 'telephone_directory' ? 'টেলিফোন ডিরেক্টরি' :
          currentView === 'api_settings' ? 'API Settings' :
          currentView === 'audit_logs' ? 'লগ বই' :
                   currentView === 'profile' ? 'প্রোফাইল' :
                   (user.role === 'admin' ? 'সিস্টেম ওভারভিউ' : 'আমার ড্যাশবোর্ড')}
                </h2>
                {user.role === 'employee' && currentView === 'dashboard' && (
                  <button onClick={() => setCurrentView('application_form')} className="bg-[#1a3a6b] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-800 transition flex items-center gap-2">
                    <PlusCircle className="w-4 h-4" />
                    নতুন আবেদন
                  </button>
                )}
              </div>
              
              <div className="p-6">
                {currentView === 'application_form' ? <ApplicationForm user={user} /> : 
                 currentView === 'user_management' ? <UserManagement /> :
                 currentView === 'division_management' ? <DivisionManagement /> :
                 currentView === 'role_management' ? <RoleManagement /> :
                 currentView === 'my_applications' ? <ApplicationList user={user} view="my_applications" /> :
                 currentView === 'all_applications' ? <AllApplications user={user} /> :
                 currentView === 'received_applications' ? <ReceivedApplications user={user} /> :
                 currentView === 'forwarded_applications' ? <ForwardedApplications user={user} /> :
                 currentView === 'rejected_applications' ? <RejectedApplications user={user} /> :
                 currentView === 'assigned_applications' ? <ApplicationList user={user} view="assigned_applications" /> :
                 currentView === 'reports' ? <ReportsPage user={user} /> :
          currentView === 'telephone_directory' ? <TelephoneDirectoryPage user={user} /> :
          currentView === 'system_settings' ? <SystemSettings /> :
          currentView === 'api_settings' ? <ApiSettings /> :
          currentView === 'audit_logs' ? <AuditLogBook /> :
                 currentView === 'profile' ? <Profile user={user} onUpdate={setUser} /> :
                 (user.role === 'admin' ? <AdminDashboard /> : 
                  user.role?.startsWith('desk_officer_') ? <EmployeeDashboard user={user} onOpenForm={() => setCurrentView('application_form')} onOpenApplications={() => setCurrentView('assigned_applications')} onOpenProfile={() => setCurrentView('profile')} onOpenTelephoneDirectory={() => setCurrentView('telephone_directory')} /> : 
                 <EmployeeDashboard user={user} onOpenForm={() => setCurrentView('application_form')} onOpenApplications={() => setCurrentView('my_applications')} onOpenProfile={() => setCurrentView('profile')} onOpenTelephoneDirectory={() => setCurrentView('telephone_directory')} />)}
               </div>
             </div>
           </main>
        </div>
        )}
      </div>

      <footer className="bg-white border-t border-gray-200 mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} University Grants Commission of Bangladesh. All rights reserved.</p>
          <p className="text-[10px] text-gray-300 mt-1 uppercase tracking-widest">Developed by ICT Division, UGC</p>
        </div>
      </footer>
    </div>
  );
}

function AlertModal({ isOpen, message, onClose }: { isOpen: boolean, message: string, onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center">
        <div className="text-red-500 mb-4 flex justify-center"><AlertTriangle className="w-10 h-10" /></div>
        <p className="text-sm font-bold text-gray-800 mb-6">{message}</p>
        <button onClick={onClose} className="px-6 py-2 bg-[#1a3a6b] text-white rounded-lg text-xs font-bold hover:bg-blue-800">ঠিক আছে</button>
      </div>
    </div>
  );
}

function ConfirmModal({ isOpen, message, onConfirm, onCancel }: { isOpen: boolean, message: string, onConfirm: () => void, onCancel: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center">
        <p className="text-sm font-bold text-gray-800 mb-6">{message}</p>
        <div className="flex justify-center gap-4">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-xs font-bold hover:bg-gray-300">বাতিল</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700">নিশ্চিত</button>
        </div>
      </div>
    </div>
  );
}

function ServiceTypeSummary({ serviceType }: { serviceType: string }) {
  const groups = serviceType
    .split(', ')
    .filter(Boolean)
    .reduce((acc, item) => {
      const [category, detail] = item.split(' - ');
      const key = category?.trim() || item.trim();
      const value = detail?.trim() || '';
      if (!acc[key]) acc[key] = [];
      if (value) acc[key].push(value);
      return acc;
    }, {} as Record<string, string[]>);

  return (
    <div className="min-w-[280px] max-w-[420px] space-y-2">
      {Object.entries(groups).map(([category, details]) => (
        <div key={category} className="rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-2">
          <div className="text-[10px] font-bold text-blue-800">{category}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {details.length > 0 ? (
              details.map((detail) => (
                <span
                  key={`${category}-${detail}`}
                  className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-medium text-blue-700"
                >
                  {detail}
                </span>
              ))
            ) : (
              <span className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-medium text-blue-700">
                প্রযোজ্য
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function getOfficerActionDetailsFromValue(value?: string): OfficerActionDetailsMap {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function getServiceEntries(serviceType?: string) {
  return `${serviceType || ''}`
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf(' - ');
      if (separatorIndex === -1) {
        return { category: '', detail: entry };
      }
      return {
        category: entry.slice(0, separatorIndex).trim(),
        detail: entry.slice(separatorIndex + 3).trim(),
      };
    });
}

function getRoleSelectedItems(serviceType: string | undefined, role: string, systemSettings: AppSystemSettings) {
  const officerCategoryMap = getOfficerCategoryMap(systemSettings);
  const category = officerCategoryMap[role];
  if (!category) return [];

  return getServiceEntries(serviceType)
    .filter((entry) => entry.category === category && entry.detail && !systemSettings.requestTypes.includes(entry.detail))
    .map((entry) => entry.detail);
}

function getAssignedItemsForRole(
  app: Application,
  role: string,
  systemSettings: AppSystemSettings,
  officerDetails?: OfficerActionDetailsMap,
) {
  const details = officerDetails || getOfficerActionDetailsFromValue(app.officer_action_details);
  const itemAssignments = getRoleItemAssignments(details, role);
  const storedItems = itemAssignments.flatMap((assignment) => assignment.assigned_items);

  if (storedItems.length > 0) {
    return Array.from(new Set(storedItems));
  }

  return getRoleSelectedItems(app.service_type, role, systemSettings);
}

function SidebarLink({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
      {icon && <span className={active ? 'text-blue-600' : 'text-gray-400'}>{icon}</span>}
      {label}
    </button>
  );
}

function ApplicationForm({ user }: { user: UserData }) {
  const systemSettings = useSystemSettings();
  const branding = systemSettings.formBranding;
  const activeCategories = systemSettings.categories.filter((category) => category.active && category.key.trim());
  const categoryLabelMap = activeCategories.reduce<Record<string, string>>((acc, category) => {
    acc[category.key] = category.label || category.key;
    return acc;
  }, {});
  const [submitted, setSubmitted] = useState(false);
  const [trackingNo, setTrackingNo] = useState('');
  const [formOpenTime] = useState(new Date().toLocaleString('bn-BD'));
  const formPageRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    applicant_name: user.name_bn,
    designation: user.designation || '',
    division: user.division || '',
    mobile: user.mobile || '',
    service_type: [] as string[],
    problem_details: '',
    category_problem_details: {} as Record<string, string>
  });

  if (!user.signature) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5" />
        <div>
          <p className="font-bold">সতর্কতা!</p>
          <p className="text-sm">আবেদন দাখিল করার আগে প্রোফাইলে আপনার স্বাক্ষর আপলোড করুন। স্বাক্ষর ছাড়া আবেদন করা যাবে না।</p>
        </div>
      </div>
    );
  }

  const handleServiceChange = (service: string) => {
    setFormData(prev => ({
      ...prev,
      service_type: prev.service_type.includes(service) 
        ? prev.service_type.filter(s => s !== service)
        : [...prev.service_type, service]
    }));
  };

  const selectedCategories = activeCategories
    .map((category) => category.key)
    .filter((category) =>
    formData.service_type.some((service) => service.startsWith(`${category} -`))
  );

  const isCategoryItemSelectionEnabled = (category: string) =>
    systemSettings.requestTypes.some((requestType) => formData.service_type.includes(`${category} - ${requestType}`));

  const updateCategoryProblemDetail = (category: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      category_problem_details: {
        ...prev.category_problem_details,
        [category]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.signature) {
      alert('আবেদন দাখিল করার আগে প্রোফাইলে আপনার স্বাক্ষর আপলোড করুন।');
      return;
    }
    const categoriesMissingItems = selectedCategories.filter((category) => {
      const hasSelectedItem = formData.service_type.some((entry) => {
        if (!entry.startsWith(`${category} - `)) return false;
        const detail = entry.replace(`${category} - `, '').trim();
        return detail && !systemSettings.requestTypes.includes(detail);
      });
      return !hasSelectedItem;
    });

    if (categoriesMissingItems.length > 0) {
      const labels = categoriesMissingItems.map((category) => categoryLabelMap[category] || category).join(', ');
      alert(`নিম্নোক্ত ক্যাটাগরির জন্য অন্তত একটি আইটেম নির্বাচন করুন: ${labels}`);
      return;
    }
    try {
      const combinedProblemDetails = selectedCategories
        .map((category) => {
          const detail = formData.category_problem_details[category]?.trim();
          return detail ? `${categoryLabelMap[category] || category}: ${detail}` : '';
        })
        .filter(Boolean)
        .join('\n');

      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: user.email,
          user_name: user.name_bn,
          division: formData.division,
          designation: formData.designation,
          mobile: formData.mobile,
          service_type: formData.service_type.join(', '),
          problem_details: combinedProblemDetails || formData.problem_details,
          category_problem_details: formData.category_problem_details,
          applicant_signature: user.signature,
          applicant_signed_at: formOpenTime
        })
      });
      const data = await response.json();
      setTrackingNo(data.tracking_no);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 10000);
    } catch (error) {
      console.error('Error submitting application:', error);
    }
  };

  const handlePrintForm = () => {
    if (!formPageRef.current) return;

    const printWindow = window.open('', '_blank', 'width=1100,height=900');
    if (!printWindow) {
      alert('প্রিন্ট ফরম খোলা যায়নি। অনুগ্রহ করে পপ-আপ অনুমতি দিন।');
      return;
    }

    const printStyles = `
      <style>
        body { margin: 0; padding: 16px; background: #f3f4f6; font-family: "Noto Sans Bengali", "Inter", sans-serif; }
        .form-page {
          width: 794px;
          margin: 0 auto;
          padding: 28px 30px;
          background: #fff;
          font-family: "Noto Sans Bengali", "Inter", sans-serif;
          color: #000;
          box-shadow: none;
        }
        .form-header { position: relative; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 10px; }
        .form-logo { position: absolute; left: 0; top: 0; }
        .form-logo img { height: 85px; }
        .form-hgroup { text-align: center; }
        .form-gov-title { font-family: "Nikosh", sans-serif; font-size: 28px; font-weight: 700; margin-bottom: 0; }
        .form-eng-title { font-size: 16px; font-weight: 700; margin-bottom: 2px; }
        .form-addr { font-size: 12px; margin-bottom: 1px; }
        .form-web { font-size: 12px; font-weight: 700; }
        .form-ref { text-align: right; font-size: 14px; color: #4b2c7e; font-weight: 700; margin-top: 4px; }
        .form-title-box { text-align: center; margin: 20px 0; }
        .form-title { font-size: 18px; font-weight: 700; text-decoration: underline; text-underline-offset: 4px; }
        .form-border-box { border: 1px solid #000; padding: 20px; margin-bottom: 20px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px 30px; margin-bottom: 20px; }
        .info-field { display: flex; align-items: flex-end; gap: 8px; }
        .info-label { font-size: 14px; font-weight: 600; white-space: nowrap; }
        .info-input { flex: 1; border: none; border-bottom: 1px solid #000; font-size: 14px; padding: 2px 5px; outline: none; background: transparent; }
        .service-row { margin-bottom: 14px; }
        .service-header { display: flex; align-items: center; gap: 12px; font-size: 14px; font-weight: 700; margin-bottom: 10px; }
        .service-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px 14px; padding-left: 92px; }
        .check-item { display: flex; align-items: center; gap: 8px; font-size: 12px; }
        .hidden { display: none !important; }
        .invisible { visibility: hidden; }
        .check-box { width: 16px; height: 16px; border: 1px solid #000; display: flex; align-items: center; justify-content: center; flex-shrink: 0; position: relative; }
        .check-item input:checked + .check-box { background: #1a3a6b; border-color: #1a3a6b; }
        .check-item input:checked + .check-box::after { content: '✓'; color: #fff; font-size: 12px; font-weight: bold; }
        .problem-section { display: flex; gap: 12px; margin-top: 18px; }
        .problem-label { font-size: 14px; font-weight: 700; white-space: nowrap; padding-top: 5px; }
        .problem-textarea { flex: 1; border: 1px solid #000; min-height: 80px; padding: 10px; font-size: 14px; resize: none; outline: none; }
        .problem-box { flex: 1; width: 100%; min-height: 96px; border: 1px solid #000; }
        .problem-box-grid { display: grid; }
        .problem-column { min-width: 0; }
        .problem-column-split { border-right: 1px solid #000; }
        .problem-column-label { padding: 6px 10px 0; font-size: 13px; font-weight: 700; }
        .problem-column-textarea { width: 100%; min-height: 72px; border: 0; padding: 2px 10px 10px; font-size: 13px; resize: none; outline: none; background: transparent; }
        .sig-row { display: flex; justify-content: space-between; margin-top: 36px; }
        .sig-line { position: relative; border-top: 1px solid #000; text-align: center; font-size: 13px; font-weight: 700; width: 42%; padding-top: 6px; min-height: 28px; }
        .signature-image { position: absolute; left: 50%; transform: translateX(-50%); bottom: 100%; height: 24px; margin-bottom: 10px; }
        .signature-date { position: absolute; left: 50%; transform: translateX(-50%); bottom: 100%; margin-bottom: -2px; font-size: 10px; color: #6b7280; white-space: nowrap; font-weight: 400; }
        .ict-section { margin-top: 18px; }
        .ict-title { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
        .ict-box { border: 1px solid #000; padding: 24px 20px 20px; }
        .ict-sig-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 28px; padding-top: 12px; }
        .ict-sig-item { border-top: 1px solid #000; text-align: center; font-size: 12px; font-weight: 700; padding-top: 6px; }
        .no-print { display: none !important; }
        @page { size: A4 portrait; margin: 6mm; }
        @media print {
          body { padding: 0; background: #fff; }
          .form-page {
            width: 100%;
            max-width: 100%;
            padding: 0;
            box-shadow: none;
            margin: 0 auto;
            box-sizing: border-box;
          }
          .form-header { padding-bottom: 8px; margin-bottom: 6px; }
          .form-logo img { height: 72px; }
          .form-gov-title { font-size: 24px; }
          .form-eng-title { font-size: 14px; }
          .form-addr, .form-web, .form-ref { font-size: 11px; }
          .form-title-box { margin: 14px 0; }
          .form-title { font-size: 16px; }
          .form-border-box { padding: 14px; margin-bottom: 14px; }
          .info-grid { gap: 10px 22px; margin-bottom: 14px; }
          .info-label, .info-input { font-size: 13px; }
          .service-row { margin-bottom: 10px; }
          .service-header { gap: 8px; font-size: 12px; margin-bottom: 6px; }
          .service-grid { gap: 6px 10px; padding-left: 84px; }
          .check-item { gap: 6px; font-size: 11px; }
          .check-box { width: 14px; height: 14px; }
          .problem-section { gap: 8px; margin-top: 14px; }
          .problem-label { font-size: 13px; }
          .problem-box { min-height: 82px; }
          .problem-column-label { padding: 4px 8px 0; font-size: 12px; }
          .problem-column-textarea { min-height: 62px; padding: 2px 8px 8px; font-size: 12px; }
          .sig-row { margin-top: 28px; }
          .sig-line { font-size: 12px; min-height: 22px; }
          .signature-image { height: 20px; margin-bottom: 8px; }
          .signature-date { font-size: 9px; }
          .ict-section { margin-top: 14px; }
          .ict-title { font-size: 13px; margin-bottom: 6px; }
          .ict-box { padding: 18px 16px 16px; }
          .ict-sig-grid { gap: 14px; margin-bottom: 18px; padding-top: 8px; }
          .ict-sig-item { font-size: 11px; padding-top: 4px; }
          .no-print { display: none !important; }
        }
      </style>
    `;

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${branding.formTitle}</title>
          ${printStyles}
        </head>
        <body>
          ${formPageRef.current.outerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="application-form-container overflow-auto max-h-[85vh] p-6 bg-gray-100 rounded-xl relative">
      <style dangerouslySetInnerHTML={{ __html: `
        .form-page { 
          width: 820px; 
          margin: 0 auto; 
          padding: 40px; 
          background: #fff; 
          font-family: "Noto Sans Bengali", "Inter", sans-serif;
          color: #000;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        .form-header { position: relative; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 10px; }
        .form-logo { position: absolute; left: 0; top: 0; }
        .form-logo img { height: 85px; }
        .form-hgroup { text-align: center; }
        .form-gov-title { font-family: "Nikosh", sans-serif; font-size: 28px; font-weight: 700; margin-bottom: 0; }
        .form-eng-title { font-size: 16px; font-weight: 700; margin-bottom: 2px; }
        .form-addr { font-size: 12px; margin-bottom: 1px; }
        .form-web { font-size: 12px; font-weight: 700; }
        .form-ref { text-align: right; font-size: 14px; color: #4b2c7e; font-weight: 700; margin-top: 4px; }
        
        .form-title-box { text-align: center; margin: 20px 0; }
        .form-title { font-size: 18px; font-weight: 700; text-decoration: underline; text-underline-offset: 4px; }
        
        .form-border-box { border: 1px solid #000; padding: 20px; margin-bottom: 20px; }
        
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px 30px; margin-bottom: 20px; }
        .info-field { display: flex; align-items: flex-end; gap: 8px; }
        .info-label { font-size: 14px; font-weight: 600; white-space: nowrap; }
        .info-input { flex: 1; border: none; border-bottom: 1px solid #000; font-size: 14px; padding: 2px 5px; outline: none; background: transparent; }
        
        .service-row { margin-bottom: 18px; }
        .service-header { display: flex; align-items: center; gap: 12px; font-size: 14px; font-weight: 700; margin-bottom: 10px; }
        .service-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px 20px; padding-left: 100px; }
        .check-item { display: flex; align-items: center; gap: 10px; font-size: 13px; cursor: pointer; transition: opacity 0.2s; }
        .check-item:hover { opacity: 0.7; }
        .check-item.disabled { opacity: 0.4; cursor: not-allowed; }
        .check-item.disabled:hover { opacity: 0.4; }
        .hidden { display: none; }
        .invisible { visibility: hidden; }
        .check-box { width: 16px; height: 16px; border: 1px solid #000; display: flex; align-items: center; justify-content: center; flex-shrink: 0; position: relative; transition: all 0.2s; }
        .check-item input:checked + .check-box { background: #1a3a6b; border-color: #1a3a6b; }
        .check-item input:checked + .check-box::after { content: '✓'; color: #fff; font-size: 12px; font-weight: bold; }
        
        .problem-section { display: flex; gap: 12px; margin-top: 25px; }
        .problem-label { font-size: 14px; font-weight: 700; white-space: nowrap; padding-top: 5px; }
        .problem-textarea { flex: 1; border: 1px solid #000; min-height: 80px; padding: 10px; font-size: 14px; resize: none; outline: none; }
        .problem-box { flex: 1; width: 100%; min-height: 120px; border: 1px solid #000; }
        .problem-box-grid { display: grid; }
        .problem-column { min-width: 0; }
        .problem-column-split { border-right: 1px solid #000; }
        .problem-column-label { padding: 8px 12px 0; font-size: 14px; font-weight: 700; }
        .problem-column-textarea { width: 100%; min-height: 88px; border: 0; padding: 4px 12px 12px; font-size: 14px; resize: none; outline: none; background: transparent; }
        
        .sig-row { display: flex; justify-content: space-between; margin-top: 50px; }
        .sig-line { position: relative; border-top: 1px solid #000; text-align: center; font-size: 13px; font-weight: 700; width: 42%; padding-top: 6px; min-height: 28px; }
        .signature-image { position: absolute; left: 50%; transform: translateX(-50%); bottom: 100%; height: 24px; margin-bottom: 10px; }
        .signature-date { position: absolute; left: 50%; transform: translateX(-50%); bottom: 100%; margin-bottom: -2px; font-size: 10px; color: #6b7280; white-space: nowrap; font-weight: 400; }
        
        .ict-section { margin-top: 25px; }
        .ict-title { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
        .ict-box { border: 1px solid #000; padding: 30px 25px 25px; }
        .ict-sig-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 25px; margin-bottom: 40px; padding-top: 18px; }
        .ict-sig-item { border-top: 1px solid #000; text-align: center; font-size: 12px; font-weight: 700; padding-top: 6px; }
      `}} />
      
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={handlePrintForm}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-xs font-bold text-[#1a3a6b] shadow-sm transition hover:bg-blue-50"
        >
          <Printer className="h-4 w-4" />
          প্রিন্ট / PDF
        </button>
      </div>

      <div ref={formPageRef} className="form-page">
        {/* Header */}
        <div className="form-header">
          <div className="form-logo">
            <img src={branding.logoUrl} alt="UGC Logo" className="h-24 w-auto object-contain" />
          </div>
          <div className="form-hgroup">
            <div className="form-gov-title">{branding.headerTitleBn}</div>
            <div className="form-eng-title">{branding.headerTitleEn}</div>
            <div className="form-addr">{branding.headerAddress}</div>
            <div className="form-web">{branding.headerWebsite}</div>
          </div>
          <div className="form-ref">{trackingNo || 'আইটিএসএফ: _________________'}</div>
        </div>

        <div className="form-title-box">
          <div className="form-title">{branding.formTitle}</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-border-box">
            <div className="info-grid">
              <div className="info-field"><span className="info-label">আবেদনকারীর নাম:</span><input className="info-input" type="text" value={formData.applicant_name} onChange={e => setFormData({...formData, applicant_name: e.target.value})} required /></div>
              <div className="info-field"><span className="info-label">পদবী:</span><input className="info-input" type="text" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} /></div>
              <div className="info-field"><span className="info-label">বিভাগ/দপ্তর:</span><input className="info-input" type="text" value={formData.division} onChange={e => setFormData({...formData, division: e.target.value})} required /></div>
              <div className="info-field"><span className="info-label">মোবাইল:</span><input className="info-input" type="text" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} /></div>
            </div>

            <div className="space-y-6">
              {activeCategories.map((category, index) => {
                const isEnabled = isCategoryItemSelectionEnabled(category.key);
                return (
                  <div key={category.id} className="service-row">
                    <div className="service-header">
                      <span className={index === 0 ? '' : 'invisible'}>সেবার ধরণ:</span>
                      <span>{category.label} ➜</span>
                      {systemSettings.requestTypes.map((requestType) => (
                        <label key={`${category.id}-${requestType}`} className="check-item">
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={formData.service_type.includes(`${category.key} - ${requestType}`)}
                            onChange={() => handleServiceChange(`${category.key} - ${requestType}`)}
                          />
                          <div className="check-box"></div> {requestType}
                        </label>
                      ))}
                    </div>
                    <div className="service-grid">
                      {category.items.map((item) => (
                        <label key={`${category.id}-${item}`} className={`check-item ${isEnabled ? '' : 'disabled'}`}>
                          <input
                            type="checkbox"
                            className="hidden"
                            disabled={!isEnabled}
                            checked={formData.service_type.includes(`${category.key} - ${item}`)}
                            onChange={() => handleServiceChange(`${category.key} - ${item}`)}
                          />
                          <div className="check-box"></div> {item}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="problem-section">
              <span className="problem-label">সমস্যার বিবরণ :</span>
              <div
                className={`problem-box ${selectedCategories.length > 0 ? 'problem-box-grid' : ''}`}
                style={selectedCategories.length > 0 ? { gridTemplateColumns: `repeat(${selectedCategories.length}, minmax(0, 1fr))` } : undefined}
              >
                {selectedCategories.length > 0 ? selectedCategories.map((category, index) => (
                  <div
                    key={category}
                    className={`problem-column ${index < selectedCategories.length - 1 ? 'problem-column-split' : ''}`}
                  >
                    <div className="problem-column-label">
                      {categoryLabelMap[category] || category}
                    </div>
                    <textarea
                      className="problem-column-textarea"
                      value={formData.category_problem_details[category] || ''}
                      onChange={e => updateCategoryProblemDetail(category, e.target.value)}
                    ></textarea>
                  </div>
                )) : (
                  <div className="min-h-[120px] w-full"></div>
                )}
              </div>
            </div>

            <div className="sig-row">
              <div className="sig-line relative">
                 {user.signature && (
                   <img src={user.signature} alt="Signature" className="signature-image" />
                 )}
                 <div className="signature-date">{formOpenTime}</div>
                 আবেদনকারীর স্বাক্ষর ও তারিখ
               </div>
              <div className="sig-line">সংশ্লিষ্ট বিভাগীয় প্রধানের স্বাক্ষর ও তারিখ</div>
            </div>
          </div>

          <div className="ict-section">
            <div className="ict-title">আইসিটি বিভাগ কর্তৃক পূরণীয়:</div>
            <div className="ict-box">
              <div className="ict-sig-grid">
                {['দায়িত্বপ্রাপ্ত কর্মকর্তার স্বাক্ষর', 'উপ-পরিচালক', 'অতিরিক্ত পরিচালক', 'পরিচালক'].map(role => (
                  <div key={role} className="ict-sig-item">{role}</div>
                ))}
              </div>
              
              <div className="info-grid">
                <div className="info-field"><span className="info-label">সেবা প্রদানকারীর নাম:</span><input className="info-input" type="text" /></div>
                <div className="info-field"><span className="info-label">পদবী:</span><input className="info-input" type="text" /></div>
              </div>
              
              <div className="problem-section mt-4">
                <span className="problem-label">সেবা প্রদান সংক্রান্ত তথ্য :</span>
                <textarea className="problem-textarea" style={{ minHeight: '60px' }}></textarea>
              </div>

              <div className="sig-row mt-10">
                <div className="sig-line">সেবা প্রদানকারীর স্বাক্ষর ও তারিখ</div>
                <div className="sig-line">সেবা গ্রহণকারীর/পক্ষের স্বাক্ষর ও তারিখ</div>
              </div>
            </div>
          </div>

          <div className="mt-10 flex justify-center no-print">
            <button type="submit" className="bg-[#1a3a6b] text-white px-16 py-4 rounded-xl font-bold shadow-xl hover:bg-blue-800 transition-all flex items-center gap-3 text-lg">
              <ShieldCheck className="w-6 h-6" /> আবেদন দাখিল করুন (Submit Application)
            </button>
          </div>
        </form>

        {submitted && (
          <div className="fixed bottom-10 right-10 bg-green-600 text-white px-8 py-5 rounded-2xl shadow-2xl animate-bounce flex items-center gap-4 z-[100] border-2 border-white">
            <ShieldCheck className="w-8 h-8" />
            <div>
              <p className="font-bold text-lg">সফলভাবে দাখিল করা হয়েছে!</p>
              <p className="text-sm opacity-90">আপনার ট্র্যাকিং নম্বর: <span className="font-mono font-black underline">{trackingNo}</span></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalApplications: 0,
    inProgressApplications: 0,
    resolvedApplications: 0,
    totalUsers: 0,
    totalRoles: 0
  });
  const [allApplications, setAllApplications] = useState<Application[]>([]);
  const [applicationsLoaded, setApplicationsLoaded] = useState(false);
  const [serviceStats, setServiceStats] = useState([
    { label: 'হার্ডওয়্যার', count: 0, color: '#2563eb' },
    { label: 'নেটওয়ার্ক', count: 0, color: '#f59e0b' },
    { label: 'সফটওয়্যার', count: 0, color: '#10b981' },
    { label: 'সিস্টেম', count: 0, color: '#8b5cf6' }
  ]);
  const [recentApplications, setRecentApplications] = useState<Application[]>([]);
  const [timeframe, setTimeframe] = useState<DashboardTimeframe>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats({
        totalApplications: Number(data.totalApplications) || 0,
        inProgressApplications: Number(data.inProgressApplications) || 0,
        resolvedApplications: Number(data.resolvedApplications) || 0,
        totalUsers: Number(data.totalUsers) || 0,
        totalRoles: Number(data.totalRoles) || 0
      }))
      .catch(err => console.error('Error fetching stats:', err));

    fetch('/api/applications')
      .then(res => res.json())
      .then((data: Application[]) => {
        setAllApplications(Array.isArray(data) ? data : []);
        setApplicationsLoaded(true);
      })
      .catch(err => {
        console.error('Error fetching applications for chart:', err);
        setApplicationsLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (!applicationsLoaded) return;

    const filteredApplications = filterApplicationsByTimeframe(allApplications, timeframe, customStart, customEnd);
    setRecentApplications([...filteredApplications].sort((a, b) => b.id - a.id).slice(0, 5));

    const counts = {
      'হার্ডওয়্যার': 0,
      'নেটওয়ার্ক': 0,
      'সফটওয়্যার': 0,
      'সিস্টেম': 0
    };

    filteredApplications.forEach((app) => {
      if (app.service_type.includes('হার্ডওয়্যার')) counts['হার্ডওয়্যার'] += 1;
      if (app.service_type.includes('নেটওয়ার্ক')) counts['নেটওয়ার্ক'] += 1;
      if (app.service_type.includes('সফটওয়্যার')) counts['সফটওয়্যার'] += 1;
      if (app.service_type.includes('সিস্টেম')) counts['সিস্টেম'] += 1;
    });

    setStats((prev) => ({
      ...prev,
      totalApplications: filteredApplications.length,
      inProgressApplications: filteredApplications.filter((app) => ['In Progress', 'Presented in File'].includes(app.status)).length,
      resolvedApplications: filteredApplications.filter((app) => ['Done'].includes(app.status)).length
    }));

    setServiceStats([
      { label: 'হার্ডওয়্যার', count: counts['হার্ডওয়্যার'], color: '#2563eb' },
      { label: 'নেটওয়ার্ক', count: counts['নেটওয়ার্ক'], color: '#f59e0b' },
      { label: 'সফটওয়্যার', count: counts['সফটওয়্যার'], color: '#10b981' },
      { label: 'সিস্টেম', count: counts['সিস্টেম'], color: '#8b5cf6' }
    ]);
  }, [applicationsLoaded, allApplications, timeframe, customStart, customEnd]);

  const downloadReport = () => {
    const filteredApplications = filterApplicationsByTimeframe(allApplications, timeframe, customStart, customEnd);
    const timeframeLabel =
      timeframe === 'monthly'
        ? 'এই মাস'
        : timeframe === 'yearly'
          ? 'এই বছর'
          : timeframe === 'custom'
            ? `কাস্টম (${customStart || 'শুরু নেই'} - ${customEnd || 'শেষ নেই'})`
            : 'সর্বমোট';
    const inProgressCount = filteredApplications.filter((app) => ['In Progress', 'Presented in File'].includes(app.status)).length;
    const resolvedCount = filteredApplications.filter((app) => ['Done'].includes(app.status)).length;
    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const reportWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!reportWindow) {
      alert('প্রিন্ট রিপোর্ট খোলা যায়নি। অনুগ্রহ করে পপ-আপ অনুমতি দিন।');
      return;
    }

    const tableRows = filteredApplications.length > 0
      ? filteredApplications.map((app, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(app.tracking_no)}</td>
            <td>${escapeHtml(app.user_name)}</td>
            <td>${escapeHtml(app.division)}</td>
            <td>${escapeHtml(app.service_type)}</td>
            <td>${escapeHtml(app.status)}</td>
            <td>${escapeHtml(app.submission_date)}</td>
          </tr>
        `).join('')
      : `
          <tr>
            <td colspan="7" class="empty-row">এই সময়সীমায় কোনো আবেদন পাওয়া যায়নি</td>
          </tr>
        `;

    reportWindow.document.write(`
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>সিস্টেম ওভারভিউ রিপোর্ট</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;700;800&display=swap');
          * { box-sizing: border-box; }
          body { margin: 0; padding: 32px; font-family: 'Noto Sans Bengali', sans-serif; color: #1f2937; background: #f8fafc; }
          .report { max-width: 1100px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 24px; padding: 32px; }
          .header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; margin-bottom: 24px; }
          .title { font-size: 28px; font-weight: 800; margin: 0 0 8px; }
          .subtitle { font-size: 14px; color: #6b7280; margin: 0; }
          .meta { text-align: right; font-size: 14px; color: #4b5563; }
          .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin: 24px 0 28px; }
          .card { border: 1px solid #e5e7eb; border-radius: 18px; padding: 16px 18px; background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); }
          .card-label { font-size: 12px; color: #6b7280; margin-bottom: 8px; }
          .card-value { font-size: 28px; font-weight: 800; color: #111827; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          thead th { text-align: left; padding: 12px; background: #eff6ff; border-bottom: 1px solid #dbeafe; }
          tbody td { padding: 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
          .empty-row { text-align: center; color: #6b7280; padding: 28px; }
          @media print {
            body { background: #fff; padding: 0; }
            .report { border: none; border-radius: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="report">
          <div class="header">
            <div>
              <h1 class="title">সিস্টেম ওভারভিউ রিপোর্ট</h1>
              <p class="subtitle">সময়সীমা: ${escapeHtml(timeframeLabel)}</p>
            </div>
            <div class="meta">
              <div>রিপোর্ট প্রস্তুতের তারিখ</div>
              <strong>${escapeHtml(new Date().toLocaleString('bn-BD'))}</strong>
            </div>
          </div>

          <div class="summary">
            <div class="card">
              <div class="card-label">মোট আবেদন</div>
              <div class="card-value">${filteredApplications.length}</div>
            </div>
            <div class="card">
              <div class="card-label">প্রক্রিয়াধীন</div>
              <div class="card-value">${inProgressCount}</div>
            </div>
            <div class="card">
              <div class="card-label">সম্পন্ন</div>
              <div class="card-value">${resolvedCount}</div>
            </div>
            <div class="card">
              <div class="card-label">মোট ইউজার</div>
              <div class="card-value">${stats.totalUsers}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Tracking No</th>
                <th>Applicant</th>
                <th>Division</th>
                <th>Service Type</th>
                <th>Status</th>
                <th>Submission Date</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  const maxServiceCount = Math.max(...serviceStats.map((item) => item.count), 1);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm font-['Noto_Sans_Bengali'] lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-800">সিস্টেম ওভারভিউ ফিল্টার</h3>
          <p className="mt-1 text-xs text-gray-500">নির্বাচিত সময়সীমা অনুযায়ী পরিসংখ্যান ও রিপোর্ট দেখুন</p>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div>
            <label className="mb-1 block text-[11px] font-bold text-gray-500">সময়সীমা</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as DashboardTimeframe)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400"
            >
              <option value="all">সর্বমোট</option>
              <option value="monthly">এই মাস</option>
              <option value="yearly">এই বছর</option>
              <option value="custom">কাস্টম</option>
            </select>
          </div>
          {timeframe === 'custom' && (
            <>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-gray-500">শুরুর তারিখ</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-gray-500">শেষের তারিখ</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400"
                />
              </div>
            </>
          )}
          <button
            onClick={downloadReport}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a3a6b] px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-800"
          >
            <Printer className="h-4 w-4" /> প্রিন্ট / PDF রিপোর্ট
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="মোট আবেদন" value={stats.totalApplications.toString()} color="blue" />
        <StatCard label="প্রক্রিয়াধীন" value={stats.inProgressApplications.toString()} color="yellow" />
        <StatCard label="সম্পন্ন" value={stats.resolvedApplications.toString()} color="green" />
        <StatCard label="মোট ইউজার" value={stats.totalUsers.toString()} color="purple" />
        <StatCard label="মোট রোল" value={stats.totalRoles.toString()} color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/30 font-['Noto_Sans_Bengali']">
          <h3 className="text-sm font-bold text-gray-700 mb-4">সেবার ধরণ অনুযায়ী আবেদন</h3>
          <div className="grid grid-cols-[160px_1fr] gap-6 items-center">
            <ServiceDonut stats={serviceStats} total={stats.totalApplications} />
            <div className="space-y-3">
              {serviceStats.map((item) => (
                <div key={item.label}>
                  <ServiceRow
                    label={item.label}
                    color={item.color}
                    count={item.count}
                    total={maxServiceCount}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/30 font-['Noto_Sans_Bengali']">
          <h3 className="text-sm font-bold text-gray-700 mb-4">সাম্প্রতিক কার্যক্রম</h3>
          <div className="space-y-3">
            {recentApplications.length > 0 ? recentApplications.map((app) => (
              <div key={app.id}>
                <ActivityItem
                  trackingNo={app.tracking_no}
                  user={app.user_name}
                  status={app.status}
                />
              </div>
            )) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white/70 px-4 py-8 text-center text-xs text-gray-500">
                এখনও কোনো আবেদন জমা পড়েনি
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string, value: string, color: string }) {
  const colors: Record<string, string> = {
    blue: 'border-blue-500 text-blue-600 bg-blue-50/50',
    yellow: 'border-yellow-500 text-yellow-600 bg-yellow-50/50',
    green: 'border-green-500 text-green-600 bg-green-50/50',
    purple: 'border-purple-500 text-purple-600 bg-purple-50/50'
  };
  return (
    <div className={`p-5 rounded-xl border-l-4 shadow-sm ${colors[color]}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-2xl font-black mt-1">{value}</p>
    </div>
  );
}

function ServiceDonut({ stats, total }: { stats: { label: string, count: number, color: string }[], total: number }) {
  const circumference = 2 * Math.PI * 42;
  const normalizedTotal = Math.max(stats.reduce((sum, item) => sum + item.count, 0), 1);
  let offsetCursor = 0;

  return (
    <div className="flex items-center justify-center">
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r="42" fill="none" stroke="#e5e7eb" strokeWidth="14" />
          {stats.map((item) => {
            const arcLength = (item.count / normalizedTotal) * circumference;
            const segment = (
              <circle
                key={item.label}
                cx="60"
                cy="60"
                r="42"
                fill="none"
                stroke={item.color}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${arcLength} ${circumference - arcLength}`}
                strokeDashoffset={-offsetCursor}
              />
            );
            offsetCursor += arcLength;
            return segment;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold tracking-[0.2em] text-gray-400">মোট</span>
          <span className="text-3xl font-black text-gray-800">{total}</span>
          <span className="text-[11px] font-semibold text-gray-500">আবেদন</span>
        </div>
      </div>
    </div>
  );
}

function ServiceRow({ label, color, count, total }: { label: string, color: string, count: number, total: number }) {
  const width = total > 0 ? Math.max((count / total) * 100, count > 0 ? 12 : 0) : 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white/80 p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
          <span className="text-xs font-bold text-gray-700 truncate">{label}</span>
        </div>
        <span className="text-sm font-black text-gray-900">{count}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${width}%`, backgroundColor: color }}
        ></div>
      </div>
    </div>
  );
}

function ActivityItem({ trackingNo, user, status }: { trackingNo: string, user: string, status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, color: 'bg-gray-400' };
  return (
    <div className="flex items-center justify-between p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-100">
      <div>
        <p className="text-xs font-bold text-blue-700">{trackingNo}</p>
        <p className="text-[10px] text-gray-500">{user}</p>
      </div>
      <span className={`px-2 py-0.5 text-[9px] font-bold text-white rounded-full ${config.color}`}>
        {config.label}
      </span>
    </div>
  );
}

interface Application {
  id: number;
  tracking_no: string;
  user_email: string;
  user_name: string;
  division: string;
  designation?: string;
  mobile?: string;
  service_type: string;
  problem_details: string;
  category_problem_details?: string;
  status: string;
  submission_date: string;
  applicant_signature?: string;
  applicant_signed_at?: string;
  div_head_signature?: string;
  div_head_signed_at?: string;
  div_head_email?: string;
  officer_signature?: string;
  officer_signed_at?: string;
  officer_name?: string;
  officer_designation?: string;
  officer_service_info?: string;
  officer_action_details?: string;
  service_provider_email?: string;
  service_provider_name?: string;
  service_provider_designation?: string;
  service_provider_role?: string;
  hw_officer_sig?: string;
  hw_officer_date?: string;
  hw_officer_name?: string;
  nw_officer_sig?: string;
  nw_officer_date?: string;
  nw_officer_name?: string;
  sw_officer_sig?: string;
  sw_officer_date?: string;
  sw_officer_name?: string;
  mnt_officer_sig?: string;
  mnt_officer_date?: string;
  mnt_officer_name?: string;
}

type OfficerActionDraft = {
  officer_name: string;
  officer_designation: string;
  officer_service_info: string;
  status: string;
  assigned_items?: string[];
  provider_email?: string;
  provider_name?: string;
  provider_designation?: string;
  provider_role?: string;
};

type OfficerItemAssignment = {
  assigned_items: string[];
  provider_email?: string;
  provider_name?: string;
  provider_designation?: string;
  provider_role?: string;
  officer_name?: string;
  officer_designation?: string;
  officer_service_info?: string;
  status?: string;
  provider_signature?: string;
  provider_signed_at?: string;
  assigned_at?: string;
  desk_officer_name?: string;
};

type OfficerActionDetailsMap = Record<string, Partial<OfficerActionDraft> & {
  updated_at?: string;
  desk_officer_name?: string;
  signature?: string;
  legacy_signature?: string;
  desk_signature?: string;
  desk_signed_at?: string;
  provider_signature?: string;
  provider_signed_at?: string;
  item_assignments?: OfficerItemAssignment[];
}>;

function getRoleItemAssignments(details: OfficerActionDetailsMap, role: string): OfficerItemAssignment[] {
  const roleDetails = details[role] || {};
  const normalizedAssignments = Array.isArray(roleDetails.item_assignments)
    ? roleDetails.item_assignments
        .map((assignment) => ({
          ...assignment,
          assigned_items: Array.isArray(assignment?.assigned_items)
            ? assignment.assigned_items.map((item) => `${item}`.trim()).filter(Boolean)
            : [],
        }))
        .filter((assignment) => assignment.assigned_items.length > 0)
    : [];

  if (normalizedAssignments.length > 0) {
    return normalizedAssignments;
  }

  const legacyItems = Array.isArray(roleDetails.assigned_items)
    ? roleDetails.assigned_items.map((item) => `${item}`.trim()).filter(Boolean)
    : [];

  if (!legacyItems.length) {
    return [];
  }

  return [{
    assigned_items: legacyItems,
    provider_email: `${roleDetails.provider_email || ''}` || undefined,
    provider_name: `${roleDetails.provider_name || roleDetails.officer_name || ''}` || undefined,
    provider_designation: `${roleDetails.provider_designation || roleDetails.officer_designation || ''}` || undefined,
    provider_role: `${roleDetails.provider_role || ''}` || undefined,
    officer_name: `${roleDetails.officer_name || roleDetails.provider_name || ''}` || undefined,
    officer_designation: `${roleDetails.officer_designation || roleDetails.provider_designation || ''}` || undefined,
    officer_service_info: `${roleDetails.officer_service_info || ''}` || undefined,
    status: `${roleDetails.status || ''}` || undefined,
    provider_signature: roleDetails.provider_signature,
    provider_signed_at: roleDetails.provider_signed_at,
    assigned_at: roleDetails.updated_at,
    desk_officer_name: roleDetails.desk_officer_name,
  }];
}

function getApplicationStatusSummary(app: Application, providerEmail?: string) {
  const systemSettings = readSystemSettings();
  const officerCategoryMap = getOfficerCategoryMap(systemSettings);
  const categoryLabelMap = getActiveManagedCategories(systemSettings).reduce<Record<string, string>>((acc, category) => {
    acc[category.key] = category.label || category.key;
    return acc;
  }, {});
  const officerDetails = getOfficerActionDetailsFromValue(app.officer_action_details);
  const statusGroups = new Map<string, { label: string; color: string; categories: string[] }>();
  const relevantRoles = getRelevantOfficerRolesForServiceType(app.service_type, systemSettings);
  const isModernFormat = Object.keys(officerDetails).length > 0;

  relevantRoles.forEach((role) => {
    const category = categoryLabelMap[officerCategoryMap[role]] || officerCategoryMap[role] || role;
    const roleAssignments = getRoleItemAssignments(officerDetails, role)
      .filter((assignment) => !providerEmail || assignment.provider_email === providerEmail);
    const statusEntries = roleAssignments.length > 0
      ? roleAssignments.map((assignment) => ({
          scopeLabel: assignment.assigned_items.length > 0
            ? `${category}: ${assignment.assigned_items.join(', ')}`
            : category,
          rawStatus: assignment.status || officerDetails[role]?.status || app.status || 'Forwarded for Approval',
        }))
      : [{
          scopeLabel: category,
          rawStatus: officerDetails[role]?.status || (isModernFormat ? 'Forwarded for Approval' : (app.status || 'Forwarded for Approval')),
        }];

    statusEntries.forEach(({ scopeLabel, rawStatus }) => {
      const config = STATUS_CONFIG[rawStatus] || { label: rawStatus, color: 'bg-gray-400' };
      const existing = statusGroups.get(config.label);

      if (existing) {
        if (!existing.categories.includes(scopeLabel)) {
          existing.categories.push(scopeLabel);
        }
      } else {
        statusGroups.set(config.label, {
          label: config.label,
          color: config.color,
          categories: [scopeLabel],
        });
      }
    });
  });

  if (statusGroups.size === 0) {
    const config = STATUS_CONFIG[app.status] || { label: app.status, color: 'bg-gray-400' };
    statusGroups.set(config.label, { label: config.label, color: config.color, categories: [] });
  }

  return Array.from(statusGroups.values());
}

function ApplicationStatusSummary({ app, providerEmail }: { app: Application, providerEmail?: string }) {
  const statuses = getApplicationStatusSummary(app, providerEmail);

  return (
    <div className="min-w-[220px] max-w-[340px] space-y-2">
      {statuses.map((item) => (
        <div key={`${item.label}-${item.categories.join(',')}`} className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-700">
            <span>{item.categories.join(', ') || 'সাধারণ'}</span>
            <span className="text-slate-400">:</span>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${item.color}`}>
              {item.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReceivedApplications({ user }: { user: UserData }) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [alertMessage, setAlertMessage] = useState('');
  const [confirmRejectId, setConfirmRejectId] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [textSearch, setTextSearch] = useState('');

  const fetchApps = async () => {
    try {
      const response = await fetch('/api/applications');
      const data = await response.json();
      const filtered = data.filter((app: Application) => app.division === user.division && app.status === 'Submitted');
      setApplications(filtered);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, [user.division]);

  const filteredApplications = applications.filter((app) => {
    const submittedAt = parseSubmissionDate(app.submission_date);
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo) : null;

    if (fromDate && submittedAt && submittedAt < fromDate) return false;
    if (toDate && submittedAt) {
      const inclusiveToDate = new Date(toDate);
      inclusiveToDate.setHours(23, 59, 59, 999);
      if (submittedAt > inclusiveToDate) return false;
    }
    if (serviceFilter && !app.service_type.includes(serviceFilter)) return false;
    if (statusFilter) {
      const appStatusLabel = STATUS_CONFIG[app.status]?.label || app.status;
      const selectedStatusLabel = STATUS_CONFIG[statusFilter]?.label || statusFilter;
      if (appStatusLabel !== selectedStatusLabel) return false;
    }
    if (!matchesTextQuery(textSearch, app.tracking_no, app.user_name, app.service_type, app.status)) return false;
    return true;
  });

  const printFilteredReport = () => {
    const reportWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!reportWindow) {
      alert('রিপোর্ট খোলা যায়নি। অনুগ্রহ করে পপ-আপ অনুমতি দিন।');
      return;
    }

    const activeServiceLabel = serviceFilter || 'সকল';
    const activeStatusLabel = statusFilter ? (STATUS_CONFIG[statusFilter]?.label || statusFilter) : 'সকল';
    const activeDateLabel = dateFrom || dateTo ? `${dateFrom || 'শুরু নেই'} - ${dateTo || 'শেষ নেই'}` : 'সকল সময়';

    const rows = filteredApplications.length > 0
      ? filteredApplications.map((app, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(app.tracking_no)}</td>
            <td>${escapeHtml(app.user_name)}</td>
            <td>${escapeHtml(app.submission_date)}</td>
            <td>${escapeHtml(app.service_type)}</td>
            <td>${escapeHtml(STATUS_CONFIG[app.status]?.label || app.status)}</td>
          </tr>
        `).join('')
      : `<tr><td colspan="6" class="empty-row">নির্বাচিত ফিল্টারে কোনো আবেদন পাওয়া যায়নি</td></tr>`;

    reportWindow.document.write(`
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8" />
        <title>আগত আবেদন রিপোর্ট</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;700;800&display=swap');
          * { box-sizing: border-box; }
          body { margin: 0; padding: 28px; font-family: 'Noto Sans Bengali', sans-serif; color: #1f2937; background: #f8fafc; }
          .report { max-width: 1100px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 24px; padding: 32px; }
          .header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
          .title { margin: 0; font-size: 28px; font-weight: 800; }
          .subtitle { margin: 8px 0 0; font-size: 14px; color: #6b7280; }
          .meta { text-align: right; font-size: 13px; color: #4b5563; }
          .filters, .summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-bottom: 24px; }
          .filter-card, .card { border: 1px solid #e5e7eb; border-radius: 18px; padding: 14px 16px; background: #f8fafc; }
          .filter-label, .card-label { font-size: 11px; color: #6b7280; margin-bottom: 6px; }
          .filter-value { font-size: 16px; font-weight: 700; color: #111827; }
          .card-value { font-size: 28px; font-weight: 800; color: #111827; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          thead th { text-align: left; padding: 12px; background: #eff6ff; border-bottom: 1px solid #dbeafe; }
          tbody td { padding: 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
          .empty-row { text-align: center; color: #6b7280; padding: 28px; }
          @media print { body { background: #fff; padding: 0; } .report { border: none; border-radius: 0; padding: 0; } }
        </style>
      </head>
      <body>
        <div class="report">
          <div class="header">
            <div>
              <h1 class="title">আগত আবেদন রিপোর্ট</h1>
              <p class="subtitle">${escapeHtml(user.name_bn)} | ${escapeHtml(user.division || 'বিভাগ নেই')}</p>
            </div>
            <div class="meta">
              <div>রিপোর্ট প্রস্তুতের তারিখ</div>
              <strong>${escapeHtml(new Date().toLocaleString('bn-BD'))}</strong>
            </div>
          </div>
          <div class="filters">
            <div class="filter-card"><div class="filter-label">তারিখ সীমা</div><div class="filter-value">${escapeHtml(activeDateLabel)}</div></div>
            <div class="filter-card"><div class="filter-label">সেবার ধরণ</div><div class="filter-value">${escapeHtml(activeServiceLabel)}</div></div>
            <div class="filter-card"><div class="filter-label">অবস্থা</div><div class="filter-value">${escapeHtml(activeStatusLabel)}</div></div>
          </div>
          <div class="summary">
            <div class="card"><div class="card-label">মোট আবেদন</div><div class="card-value">${filteredApplications.length}</div></div>
            <div class="card"><div class="card-label">প্রক্রিয়াধীন</div><div class="card-value">${filteredApplications.filter((app) => ['Forwarded for Approval', 'In Progress', 'Presented in File'].includes(app.status)).length}</div></div>
            <div class="card"><div class="card-label">সম্পন্ন</div><div class="card-value">${filteredApplications.filter((app) => ['Done'].includes(app.status)).length}</div></div>
          </div>
          <table>
            <thead><tr><th>#</th><th>ট্র্যাকিং নম্বর</th><th>আবেদনকারী</th><th>তারিখ</th><th>সেবার ধরণ</th><th>অবস্থা</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  const handleApprove = async (appId: number, status: string = 'Forwarded for Approval') => {
    if (!user.signature) {
      setAlertMessage('আবেদন অনুমোদন/বাতিল করার আগে প্রোফাইলে আপনার স্বাক্ষর আপলোড করুন।');
      return;
    }
    try {
      await fetch('/api/applications/approve', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: appId,
          status,
          div_head_email: user.email,
          div_head_signature: user.signature,
          div_head_signed_at: new Date().toLocaleString('bn-BD')
        })
      });
      fetchApps();
    } catch (error) {
      console.error('Error approving application:', error);
    }
  };

  if (loading) return <div className="text-center py-10 text-gray-500 text-xs">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 font-['Noto_Sans_Bengali']">
        <div className="grid gap-4 xl:grid-cols-[280px_1fr] xl:items-start">
          <div className="self-start pt-1">
            <h3 className="text-sm font-bold text-gray-900">রিপোর্ট ও ফিল্টার</h3>
            <p className="mt-1 text-xs text-gray-500">তারিখ সীমা, সেবার ধরণ এবং অবস্থা অনুযায়ী আবেদন খুঁজুন ও রিপোর্ট নিন</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 xl:items-end">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-gray-500">টেবিল সার্চ</label>
              <input type="text" value={textSearch} onChange={(e) => setTextSearch(e.target.value)} placeholder="ট্র্যাকিং নম্বর, আবেদনকারী বা অবস্থা" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-gray-500">শুরুর তারিখ</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-gray-500">শেষের তারিখ</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-gray-500">সেবার ধরণ</label>
              <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400">
                <option value="">সকল</option>
                {SERVICE_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-gray-500">অবস্থা</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400">
                <option value="">সকল</option>
                {REPORT_STATUS_OPTIONS.map((item) => <option key={item} value={item}>{STATUS_CONFIG[item]?.label || item}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-3 xl:justify-end">
              <button onClick={() => { setDateFrom(''); setDateTo(''); setServiceFilter(''); setStatusFilter(''); setTextSearch(''); }} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-100">রিসেট</button>
              <button onClick={printFilteredReport} className="inline-flex items-center gap-2 rounded-xl bg-[#1a3a6b] px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-800"><Printer className="h-4 w-4" /> রিপোর্ট / প্রিন্ট</button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
        <thead>
          <tr className="bg-gray-50/50">
            <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">ট্র্যাকিং নম্বর</th>
            <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">আবেদনকারী</th>
            <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">সেবার ধরণ</th>
            <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">অবস্থা</th>
            <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">অ্যাকশন</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {filteredApplications.map((app) => (
            <tr key={app.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-4 py-4 text-xs font-bold text-blue-600">{app.tracking_no}</td>
              <td className="px-4 py-4 text-xs text-gray-600">{app.user_name}</td>
              <td className="px-4 py-4 text-xs text-gray-500">
                <ServiceTypeSummary serviceType={app.service_type} />
              </td>
              <td className="px-4 py-4">
                <ApplicationStatusSummary app={app} />
              </td>
              <td className="px-4 py-4 text-right space-x-2">
                <button 
                  onClick={() => setSelectedApp(app)}
                  className="text-[#1a3a6b] hover:text-blue-900 text-xs font-bold"
                >
                  দেখুন
                </button>
                <button 
                  onClick={() => handleApprove(app.id, 'Forwarded for Approval')}
                  className="bg-green-600 text-white px-3 py-1 rounded text-[10px] font-bold hover:bg-green-700"
                >
                  অনুমোদন করুন
                </button>
                <button 
                  onClick={() => setConfirmRejectId(app.id)}
                  className="bg-red-600 text-white px-3 py-1 rounded text-[10px] font-bold hover:bg-red-700"
                >
                  বাতিল করুন
                </button>
              </td>
            </tr>
          ))}
          {filteredApplications.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-xs italic">কোন নতুন আবেদন নেই</td>
            </tr>
          )}
        </tbody>
        </table>
      </div>

      {selectedApp && (
        <ApplicationViewModal app={selectedApp} onClose={() => setSelectedApp(null)} />
      )}
      <ConfirmModal
        isOpen={confirmRejectId !== null}
        message="আপনি কি নিশ্চিত যে আপনি এই আবেদনটি বাতিল করতে চান?"
        onConfirm={async () => {
          if (confirmRejectId !== null) {
            await handleApprove(confirmRejectId, 'Rejected by Divisional Head');
            setConfirmRejectId(null);
          }
        }}
        onCancel={() => setConfirmRejectId(null)}
      />
      <AlertModal isOpen={!!alertMessage} message={alertMessage} onClose={() => setAlertMessage('')} />
    </div>
  );
}

function ForwardedApplications({ user }: { user: UserData }) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [textSearch, setTextSearch] = useState('');

  const fetchApps = async () => {
    try {
      const response = await fetch('/api/applications');
      const data = await response.json();
      const filtered = data.filter((app: Application) => app.div_head_email === user.email && (app.status === 'Forwarded for Approval' || app.status === 'Rejected by Divisional Head' || app.status === 'In Progress' || app.status === 'Done'));
      setApplications(filtered);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, [user.email]);

  const filteredApplications = applications.filter((app) => {
    const submittedAt = parseSubmissionDate(app.submission_date);
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo) : null;

    if (fromDate && submittedAt && submittedAt < fromDate) return false;
    if (toDate && submittedAt) {
      const inclusiveToDate = new Date(toDate);
      inclusiveToDate.setHours(23, 59, 59, 999);
      if (submittedAt > inclusiveToDate) return false;
    }
    if (serviceFilter && !app.service_type.includes(serviceFilter)) return false;
    if (statusFilter) {
      const appStatusLabel = STATUS_CONFIG[app.status]?.label || app.status;
      const selectedStatusLabel = STATUS_CONFIG[statusFilter]?.label || statusFilter;
      if (appStatusLabel !== selectedStatusLabel) return false;
    }
    if (!matchesTextQuery(textSearch, app.tracking_no, app.user_name, app.service_type, app.status)) return false;
    return true;
  });

  const printFilteredReport = () => {
    const reportWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!reportWindow) {
      alert('রিপোর্ট খোলা যায়নি। অনুগ্রহ করে পপ-আপ অনুমতি দিন।');
      return;
    }
    const activeServiceLabel = serviceFilter || 'সকল';
    const activeStatusLabel = statusFilter ? (STATUS_CONFIG[statusFilter]?.label || statusFilter) : 'সকল';
    const activeDateLabel = dateFrom || dateTo ? `${dateFrom || 'শুরু নেই'} - ${dateTo || 'শেষ নেই'}` : 'সকল সময়';
    const rows = filteredApplications.length > 0
      ? filteredApplications.map((app, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(app.tracking_no)}</td>
            <td>${escapeHtml(app.user_name)}</td>
            <td>${escapeHtml(app.submission_date)}</td>
            <td>${escapeHtml(app.service_type)}</td>
            <td>${escapeHtml(STATUS_CONFIG[app.status]?.label || app.status)}</td>
          </tr>
        `).join('')
      : `<tr><td colspan="6" class="empty-row">নির্বাচিত ফিল্টারে কোনো আবেদন পাওয়া যায়নি</td></tr>`;

    reportWindow.document.write(`
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8" />
        <title>প্রেরিত আবেদন রিপোর্ট</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;700;800&display=swap');
          * { box-sizing: border-box; }
          body { margin: 0; padding: 28px; font-family: 'Noto Sans Bengali', sans-serif; color: #1f2937; background: #f8fafc; }
          .report { max-width: 1100px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 24px; padding: 32px; }
          .header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
          .title { margin: 0; font-size: 28px; font-weight: 800; }
          .subtitle { margin: 8px 0 0; font-size: 14px; color: #6b7280; }
          .meta { text-align: right; font-size: 13px; color: #4b5563; }
          .filters, .summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-bottom: 24px; }
          .filter-card, .card { border: 1px solid #e5e7eb; border-radius: 18px; padding: 14px 16px; background: #f8fafc; }
          .filter-label, .card-label { font-size: 11px; color: #6b7280; margin-bottom: 6px; }
          .filter-value { font-size: 16px; font-weight: 700; color: #111827; }
          .card-value { font-size: 28px; font-weight: 800; color: #111827; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          thead th { text-align: left; padding: 12px; background: #eff6ff; border-bottom: 1px solid #dbeafe; }
          tbody td { padding: 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
          .empty-row { text-align: center; color: #6b7280; padding: 28px; }
          @media print { body { background: #fff; padding: 0; } .report { border: none; border-radius: 0; padding: 0; } }
        </style>
      </head>
      <body>
        <div class="report">
          <div class="header">
            <div>
              <h1 class="title">প্রেরিত আবেদন রিপোর্ট</h1>
              <p class="subtitle">${escapeHtml(user.name_bn)} | ${escapeHtml(user.division || 'বিভাগ নেই')}</p>
            </div>
            <div class="meta">
              <div>রিপোর্ট প্রস্তুতের তারিখ</div>
              <strong>${escapeHtml(new Date().toLocaleString('bn-BD'))}</strong>
            </div>
          </div>
          <div class="filters">
            <div class="filter-card"><div class="filter-label">তারিখ সীমা</div><div class="filter-value">${escapeHtml(activeDateLabel)}</div></div>
            <div class="filter-card"><div class="filter-label">সেবার ধরণ</div><div class="filter-value">${escapeHtml(activeServiceLabel)}</div></div>
            <div class="filter-card"><div class="filter-label">অবস্থা</div><div class="filter-value">${escapeHtml(activeStatusLabel)}</div></div>
          </div>
          <div class="summary">
            <div class="card"><div class="card-label">মোট আবেদন</div><div class="card-value">${filteredApplications.length}</div></div>
            <div class="card"><div class="card-label">প্রক্রিয়াধীন</div><div class="card-value">${filteredApplications.filter((app) => ['Forwarded for Approval', 'In Progress', 'Presented in File'].includes(app.status)).length}</div></div>
            <div class="card"><div class="card-label">সম্পন্ন</div><div class="card-value">${filteredApplications.filter((app) => ['Done'].includes(app.status)).length}</div></div>
          </div>
          <table>
            <thead><tr><th>#</th><th>ট্র্যাকিং নম্বর</th><th>আবেদনকারী</th><th>তারিখ</th><th>সেবার ধরণ</th><th>অবস্থা</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  if (loading) return <div className="text-center py-10 text-gray-500 text-xs">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 font-['Noto_Sans_Bengali']">
        <div className="grid gap-4 xl:grid-cols-[280px_1fr] xl:items-start">
          <div className="self-start pt-1">
            <h3 className="text-sm font-bold text-gray-900">রিপোর্ট ও ফিল্টার</h3>
            <p className="mt-1 text-xs text-gray-500">তারিখ সীমা, সেবার ধরণ এবং অবস্থা অনুযায়ী আবেদন খুঁজুন ও রিপোর্ট নিন</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 xl:items-end">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-gray-500">টেবিল সার্চ</label>
              <input type="text" value={textSearch} onChange={(e) => setTextSearch(e.target.value)} placeholder="ট্র্যাকিং নম্বর, আবেদনকারী বা অবস্থা" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-gray-500">শুরুর তারিখ</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-gray-500">শেষের তারিখ</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-gray-500">সেবার ধরণ</label>
              <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400">
                <option value="">সকল</option>
                {SERVICE_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-gray-500">অবস্থা</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400">
                <option value="">সকল</option>
                {REPORT_STATUS_OPTIONS.map((item) => <option key={item} value={item}>{STATUS_CONFIG[item]?.label || item}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-3 xl:justify-end">
              <button onClick={() => { setDateFrom(''); setDateTo(''); setServiceFilter(''); setStatusFilter(''); setTextSearch(''); }} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-100">রিসেট</button>
              <button onClick={printFilteredReport} className="inline-flex items-center gap-2 rounded-xl bg-[#1a3a6b] px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-800"><Printer className="h-4 w-4" /> রিপোর্ট / প্রিন্ট</button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
        <thead>
          <tr className="bg-gray-50/50">
            <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">ট্র্যাকিং নম্বর</th>
            <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">আবেদনকারী</th>
            <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">সেবার ধরণ</th>
            <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">অবস্থা</th>
            <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">অ্যাকশন</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {filteredApplications.map((app) => (
            <tr key={app.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-4 py-4 text-xs font-bold text-blue-600">{app.tracking_no}</td>
              <td className="px-4 py-4 text-xs text-gray-600">{app.user_name}</td>
              <td className="px-4 py-4 text-xs text-gray-500">
                <ServiceTypeSummary serviceType={app.service_type} />
              </td>
              <td className="px-4 py-4">
                <ApplicationStatusSummary app={app} />
              </td>
              <td className="px-4 py-4 text-right space-x-2">
                <button 
                  onClick={() => setSelectedApp(app)}
                  className="text-[#1a3a6b] hover:text-blue-900 text-xs font-bold"
                >
                  দেখুন
                </button>
              </td>
            </tr>
          ))}
          {filteredApplications.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-xs italic">কোন প্রেরিত আবেদন নেই</td>
            </tr>
          )}
        </tbody>
        </table>
      </div>

      {selectedApp && (
        <ApplicationViewModal app={selectedApp} onClose={() => setSelectedApp(null)} />
      )}
    </div>
  );
}

function RejectedApplications({ user }: { user: UserData }) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [textSearch, setTextSearch] = useState('');

  const fetchApps = async () => {
    try {
      const response = await fetch('/api/applications');
      const data = await response.json();
      const filtered = data.filter((app: Application) =>
        app.status === 'Rejected by Divisional Head' &&
        (user.role === 'admin' || app.div_head_email === user.email)
      );
      setApplications(filtered);
    } catch (error) {
      console.error('Error fetching rejected applications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, [user.email]);

  const filteredApplications = applications.filter((app) => {
    const submittedAt = parseSubmissionDate(app.submission_date);
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo) : null;

    if (fromDate && submittedAt && submittedAt < fromDate) return false;
    if (toDate && submittedAt) {
      const inclusiveToDate = new Date(toDate);
      inclusiveToDate.setHours(23, 59, 59, 999);
      if (submittedAt > inclusiveToDate) return false;
    }
    if (serviceFilter && !app.service_type.includes(serviceFilter)) return false;
    if (statusFilter) {
      const appStatusLabel = STATUS_CONFIG[app.status]?.label || app.status;
      const selectedStatusLabel = STATUS_CONFIG[statusFilter]?.label || statusFilter;
      if (appStatusLabel !== selectedStatusLabel) return false;
    }
    if (!matchesTextQuery(textSearch, app.tracking_no, app.user_name, app.service_type, app.status)) return false;
    return true;
  });

  const printFilteredReport = () => {
    const reportWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!reportWindow) {
      alert('রিপোর্ট খোলা যায়নি। অনুগ্রহ করে পপ-আপ অনুমতি দিন।');
      return;
    }
    const activeServiceLabel = serviceFilter || 'সকল';
    const activeStatusLabel = statusFilter ? (STATUS_CONFIG[statusFilter]?.label || statusFilter) : 'সকল';
    const activeDateLabel = dateFrom || dateTo ? `${dateFrom || 'শুরু নেই'} - ${dateTo || 'শেষ নেই'}` : 'সকল সময়';
    const rows = filteredApplications.length > 0
      ? filteredApplications.map((app, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(app.tracking_no)}</td>
            <td>${escapeHtml(app.user_name)}</td>
            <td>${escapeHtml(app.submission_date)}</td>
            <td>${escapeHtml(app.service_type)}</td>
            <td>${escapeHtml(STATUS_CONFIG[app.status]?.label || app.status)}</td>
          </tr>
        `).join('')
      : `<tr><td colspan="6" class="empty-row">নির্বাচিত ফিল্টারে কোনো আবেদন পাওয়া যায়নি</td></tr>`;

    reportWindow.document.write(`
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8" />
        <title>বাতিলকৃত আবেদন রিপোর্ট</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;700;800&display=swap');
          * { box-sizing: border-box; }
          body { margin: 0; padding: 28px; font-family: 'Noto Sans Bengali', sans-serif; color: #1f2937; background: #f8fafc; }
          .report { max-width: 1100px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 24px; padding: 32px; }
          .header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
          .title { margin: 0; font-size: 28px; font-weight: 800; }
          .subtitle { margin: 8px 0 0; font-size: 14px; color: #6b7280; }
          .meta { text-align: right; font-size: 13px; color: #4b5563; }
          .filters, .summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-bottom: 24px; }
          .filter-card, .card { border: 1px solid #e5e7eb; border-radius: 18px; padding: 14px 16px; background: #f8fafc; }
          .filter-label, .card-label { font-size: 11px; color: #6b7280; margin-bottom: 6px; }
          .filter-value { font-size: 16px; font-weight: 700; color: #111827; }
          .card-value { font-size: 28px; font-weight: 800; color: #111827; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          thead th { text-align: left; padding: 12px; background: #eff6ff; border-bottom: 1px solid #dbeafe; }
          tbody td { padding: 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
          .empty-row { text-align: center; color: #6b7280; padding: 28px; }
          @media print { body { background: #fff; padding: 0; } .report { border: none; border-radius: 0; padding: 0; } }
        </style>
      </head>
      <body>
        <div class="report">
          <div class="header">
            <div>
              <h1 class="title">বাতিলকৃত আবেদন রিপোর্ট</h1>
              <p class="subtitle">${escapeHtml(user.name_bn)} | ${escapeHtml(user.division || 'বিভাগ নেই')}</p>
            </div>
            <div class="meta">
              <div>রিপোর্ট প্রস্তুতের তারিখ</div>
              <strong>${escapeHtml(new Date().toLocaleString('bn-BD'))}</strong>
            </div>
          </div>
          <div class="filters">
            <div class="filter-card"><div class="filter-label">তারিখ সীমা</div><div class="filter-value">${escapeHtml(activeDateLabel)}</div></div>
            <div class="filter-card"><div class="filter-label">সেবার ধরন</div><div class="filter-value">${escapeHtml(activeServiceLabel)}</div></div>
            <div class="filter-card"><div class="filter-label">অবস্থা</div><div class="filter-value">${escapeHtml(activeStatusLabel)}</div></div>
          </div>
          <div class="summary">
            <div class="card"><div class="card-label">মোট আবেদন</div><div class="card-value">${filteredApplications.length}</div></div>
            <div class="card"><div class="card-label">বাতিলকৃত</div><div class="card-value">${filteredApplications.length}</div></div>
            <div class="card"><div class="card-label">সর্বশেষ অবস্থা</div><div class="card-value">${escapeHtml(STATUS_CONFIG['Rejected by Divisional Head']?.label || 'বাতিল')}</div></div>
          </div>
          <table>
            <thead><tr><th>#</th><th>ট্র্যাকিং নম্বর</th><th>আবেদনকারী</th><th>তারিখ</th><th>সেবার ধরন</th><th>অবস্থা</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  if (loading) return <div className="text-center py-10 text-gray-500 text-xs">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 font-['Noto_Sans_Bengali']">
        <div className="grid gap-4 xl:grid-cols-[280px_1fr] xl:items-start">
          <div className="self-start pt-1">
            <h3 className="text-sm font-bold text-gray-900">রিপোর্ট ও ফিল্টার</h3>
            <p className="mt-1 text-xs text-gray-500">তারিখ সীমা, সেবার ধরন এবং অবস্থা অনুযায়ী বাতিলকৃত আবেদন খুঁজুন ও রিপোর্ট নিন</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 xl:items-end">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-gray-500">টেবিল সার্চ</label>
              <input type="text" value={textSearch} onChange={(e) => setTextSearch(e.target.value)} placeholder="ট্র্যাকিং নম্বর, আবেদনকারী বা অবস্থা" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-gray-500">শুরুর তারিখ</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-gray-500">শেষের তারিখ</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-gray-500">সেবার ধরন</label>
              <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400">
                <option value="">সকল</option>
                {SERVICE_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-gray-500">অবস্থা</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400">
                <option value="">সকল</option>
                <option value="Rejected by Divisional Head">{STATUS_CONFIG['Rejected by Divisional Head']?.label}</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-3 xl:justify-end">
              <button onClick={() => { setDateFrom(''); setDateTo(''); setServiceFilter(''); setStatusFilter(''); setTextSearch(''); }} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-100">রিসেট</button>
              <button onClick={printFilteredReport} className="inline-flex items-center gap-2 rounded-xl bg-[#1a3a6b] px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-800"><Printer className="h-4 w-4" /> রিপোর্ট / প্রিন্ট</button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">ট্র্যাকিং নম্বর</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">আবেদনকারী</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">সেবার ধরন</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">অবস্থা</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredApplications.map((app) => (
              <tr key={app.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-4 text-xs font-bold text-blue-600">{app.tracking_no}</td>
                <td className="px-4 py-4 text-xs text-gray-600">{app.user_name}</td>
                <td className="px-4 py-4 text-xs text-gray-500">
                  <ServiceTypeSummary serviceType={app.service_type} />
                </td>
                <td className="px-4 py-4">
                  <ApplicationStatusSummary app={app} />
                </td>
                <td className="px-4 py-4 text-right space-x-2">
                  <button
                    onClick={() => setSelectedApp(app)}
                    className="text-[#1a3a6b] hover:text-blue-900 text-xs font-bold"
                  >
                    দেখুন
                  </button>
                </td>
              </tr>
            ))}
            {filteredApplications.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-xs italic">কোন বাতিলকৃত আবেদন নেই</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedApp && (
        <ApplicationViewModal app={selectedApp} onClose={() => setSelectedApp(null)} />
      )}
    </div>
  );
}

function EmployeeDashboard({
  user,
  onOpenForm,
  onOpenApplications,
  onOpenProfile,
  onOpenTelephoneDirectory
}: {
  user: UserData;
  onOpenForm: () => void;
  onOpenApplications: () => void;
  onOpenProfile: () => void;
  onOpenTelephoneDirectory: () => void;
}) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const systemSettings = useSystemSettings();
  const [quickLinkSearch, setQuickLinkSearch] = useState('');

  useEffect(() => {
    const fetchMyApplications = async () => {
      try {
        const response = await fetch(`/api/applications?email=${encodeURIComponent(user.email)}`);
        const data = await response.json();
        setApplications(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching employee dashboard applications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyApplications();
  }, [user.email]);

  const recentApplications = [...applications].sort((a, b) => b.id - a.id).slice(0, 5);
  const inProgressCount = applications.filter((app) =>
    ['In Progress', 'প্রক্রিয়াধীন রয়েছে', 'Forwarded for Approval'].includes(app.status)
  ).length;
  const completedCount = applications.filter((app) =>
    ['Done'].includes(app.status)
  ).length;
  const latestSubmission = [...applications]
    .sort((a, b) => {
      const aDate = parseSubmissionDate(a.submission_date)?.getTime() || 0;
      const bDate = parseSubmissionDate(b.submission_date)?.getTime() || 0;
      return bDate - aDate;
    })[0]?.submission_date || 'এখনও নেই';

  const statusCards = [
    { label: 'দাখিলকৃত', count: applications.filter((app) => app.status === 'Submitted').length, tone: 'from-slate-50 to-slate-100 border-slate-200 text-slate-700' },
    { label: 'প্রয়োজনীয় ব্যবস্থা গ্রহণের জন্য প্রেরিত', count: applications.filter((app) => app.status === 'Forwarded for Approval').length, tone: 'from-indigo-50 to-blue-50 border-indigo-200 text-indigo-700' },
    { label: 'প্রক্রিয়াধীন', count: applications.filter((app) => ['In Progress', 'Presented in File'].includes(app.status)).length, tone: 'from-amber-50 to-yellow-50 border-amber-200 text-amber-700' },
    { label: 'সম্পন্ন', count: completedCount, tone: 'from-emerald-50 to-green-50 border-emerald-200 text-emerald-700' }
  ];
  const filteredQuickLinks = systemSettings.quickLinks.filter((link) => {
    const query = quickLinkSearch.trim().toLowerCase();
    if (!query) return true;
    return [link.title, link.description, link.url].some((value) => value.toLowerCase().includes(query));
  });

  return (
    <div className="space-y-6 font-['Noto_Sans_Bengali']">
      <div className="rounded-3xl border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_55%,#f8fafc_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/80 bg-white shadow-sm">
              {user.photo ? (
                <img src={user.photo} alt={user.name_bn} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-blue-50 text-blue-600">
                  <User className="h-9 w-9" />
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-blue-500">আমার আইটি সেবা</p>
              <h3 className="mt-2 text-2xl font-bold text-gray-900">{user.name_bn} এর ড্যাশবোর্ড</h3>
              <p className="mt-2 max-w-2xl text-sm text-gray-600">
                আপনার আবেদনের বর্তমান অবস্থা, সাম্প্রতিক কার্যক্রম এবং প্রয়োজনীয় পরবর্তী পদক্ষেপ এখানে দেখতে পারবেন।
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold text-blue-500">মোট আবেদন</p>
          <p className="mt-3 text-3xl font-black text-gray-900">{applications.length}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold text-amber-500">প্রক্রিয়াধীন</p>
          <p className="mt-3 text-3xl font-black text-gray-900">{inProgressCount}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold text-emerald-500">সম্পন্ন</p>
          <p className="mt-3 text-3xl font-black text-gray-900">{completedCount}</p>
        </div>
        <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold text-purple-500">সর্বশেষ আবেদন</p>
          <p className="mt-3 text-lg font-bold text-gray-900">{latestSubmission}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">সাম্প্রতিক আবেদন</h3>
              <p className="mt-1 text-xs text-gray-500">আপনার সর্বশেষ ৫টি আবেদন দ্রুত দেখুন</p>
            </div>
            <button
              onClick={onOpenApplications}
              className="text-xs font-bold text-[#1a3a6b] transition hover:text-blue-800"
            >
              সবগুলো দেখুন
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-gray-400">লোড হচ্ছে...</div>
          ) : recentApplications.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center">
              <p className="text-sm font-bold text-gray-700">এখনও কোনো আবেদন জমা পড়েনি</p>
              <p className="mt-1 text-xs text-gray-500">নতুন আবেদন শুরু করতে উপরের বাটনটি ব্যবহার করুন।</p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-gray-50/70">
                    <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">ট্র্যাকিং নম্বর</th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">তারিখ</th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">অবস্থা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-4 py-4 text-xs font-bold text-blue-600">{app.tracking_no}</td>
                      <td className="px-4 py-4 text-xs text-gray-500">{app.submission_date}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold text-white ${STATUS_CONFIG[app.status]?.color || 'bg-gray-400'}`}>
                          {STATUS_CONFIG[app.status]?.label || app.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900">আবেদনের অবস্থা</h3>
            <div className="mt-4 space-y-3">
              {statusCards.map((item) => {
                const width = applications.length > 0 ? Math.max((item.count / applications.length) * 100, item.count > 0 ? 12 : 0) : 0;
                return (
                  <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between text-xs font-bold text-gray-600">
                      <span>{item.label}</span>
                      <span>{item.count}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full border bg-gradient-to-r ${item.tone}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {!user.signature ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-red-500" />
                <div>
                  <h3 className="text-sm font-bold text-red-700">স্বাক্ষর আপলোড বাকি আছে</h3>
                  <p className="mt-1 text-xs leading-5 text-red-600">
                    নতুন আবেদন দাখিল করার আগে প্রোফাইলে গিয়ে আপনার স্বাক্ষর আপলোড করুন।
                  </p>
                  <button
                    onClick={onOpenProfile}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"
                  >
                    <User className="h-3.5 w-3.5" />
                    প্রোফাইলে যান
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-emerald-700">আপনার প্রোফাইল প্রস্তুত</h3>
              <p className="mt-1 text-xs leading-5 text-emerald-600">
                আপনার স্বাক্ষর সংরক্ষিত আছে। এখন যেকোনো সময় নতুন আবেদন দাখিল করতে পারবেন।
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900">দ্রুত লিংক</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <button onClick={onOpenForm} className="rounded-2xl border border-gray-200 px-4 py-3 text-left text-xs font-bold text-gray-700 transition hover:border-blue-200 hover:bg-blue-50">
                আবেদন ফর্ম
              </button>
              <button onClick={onOpenApplications} className="rounded-2xl border border-gray-200 px-4 py-3 text-left text-xs font-bold text-gray-700 transition hover:border-blue-200 hover:bg-blue-50">
                আবেদনের ইতিহাস
              </button>
              <button onClick={onOpenProfile} className="rounded-2xl border border-gray-200 px-4 py-3 text-left text-xs font-bold text-gray-700 transition hover:border-blue-200 hover:bg-blue-50">
                প্রোফাইল
              </button>
              {user.permissions?.includes('telephone_directory') && (
                <button onClick={onOpenTelephoneDirectory} className="rounded-2xl border border-gray-200 px-4 py-3 text-left text-xs font-bold text-gray-700 transition hover:border-blue-200 hover:bg-blue-50">
                  টেলিফোন ডিরেক্টরি
                </button>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-blue-900">শেয়ারড ডকুমেন্ট ও রিসোর্স</h4>
                  <p className="mt-1 text-[11px] leading-5 text-blue-700">
                    অ্যাডমিন এই তালিকা সম্পাদনা করতে পারবেন। ব্যবহারকারীরা শুধু খুলে দেখতে এবং browser search দিয়ে খুঁজতে পারবেন।
                  </p>
                </div>
                <div className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-blue-700 ring-1 ring-blue-100">
                  {filteredQuickLinks.length} টি
                </div>
              </div>

              <div className="mt-4 relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={quickLinkSearch}
                  onChange={(e) => setQuickLinkSearch(e.target.value)}
                  placeholder="লিংক, ডকুমেন্ট বা নাম দিয়ে খুঁজুন"
                  className="w-full rounded-xl border border-blue-100 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-700 outline-none focus:border-blue-400"
                />
              </div>

              <div className="mt-4 space-y-3">
                {filteredQuickLinks.map((link) => (
                  <div key={link.id} className="rounded-2xl border border-white bg-white/90 p-4 shadow-sm ring-1 ring-blue-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link2 className="h-4 w-4 shrink-0 text-blue-600" />
                          <h5 className="truncate text-sm font-bold text-gray-900">{link.title}</h5>
                        </div>
                        {link.description && (
                          <p className="mt-2 text-xs leading-5 text-gray-600">{link.description}</p>
                        )}
                      </div>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#1a3a6b] px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-800"
                      >
                        দেখুন
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
                {filteredQuickLinks.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-blue-200 bg-white px-4 py-8 text-center text-xs text-gray-500">
                    এই খোঁজে কোনো দ্রুত লিংক পাওয়া যায়নি।
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TelephoneDirectoryPage({ user }: { user: UserData }) {
  const [entries, setEntries] = useState<TelephoneDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TelephoneDirectoryEntry | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const canManage = !!user.permissions?.includes('settings');
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    designation: '',
    division: '',
    intercom: '',
    mobile: '',
    ip_number: '',
    notes: '',
    status: 'Active' as 'Active' | 'Inactive',
  });

  const fetchEntries = async () => {
    try {
      const response = await fetch('/api/telephone-directory');
      const data = await response.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching telephone directory:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleOpenModal = (entry?: TelephoneDirectoryEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setFormData({
        name: entry.name || '',
        designation: entry.designation || '',
        division: entry.division || '',
        intercom: entry.intercom || '',
        mobile: entry.mobile || '',
        ip_number: entry.ip_number || '',
        notes: entry.notes || '',
        status: entry.status || 'Active',
      });
    } else {
      setEditingEntry(null);
      setFormData({
        name: '',
        designation: '',
        division: '',
        intercom: '',
        mobile: '',
        ip_number: '',
        notes: '',
        status: 'Active',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      name: formData.name.trim(),
      designation: formData.designation.trim(),
      division: formData.division.trim(),
      intercom: formData.intercom.trim(),
      mobile: formData.mobile.trim(),
      ip_number: formData.ip_number.trim(),
      notes: formData.notes.trim(),
    };

    try {
      if (editingEntry) {
        await fetch(`/api/telephone-directory/${editingEntry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/telephone-directory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      setIsModalOpen(false);
      setEditingEntry(null);
      fetchEntries();
    } catch (error) {
      console.error('Error saving telephone directory entry:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await fetch(`/api/telephone-directory/${confirmDeleteId}`, { method: 'DELETE' });
      fetchEntries();
    } catch (error) {
      console.error('Error deleting telephone directory entry:', error);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!canManage || entries.length === 0) return;
    const confirmed = window.confirm('আপনি কি নিশ্চিত যে আপনি টেলিফোন ডিরেক্টরির সব এন্ট্রি মুছে ফেলতে চান?');
    if (!confirmed) return;

    setIsClearing(true);
    try {
      const response = await fetch('/api/telephone-directory', { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || 'সব এন্ট্রি মুছতে সমস্যা হয়েছে।');
      }
      await fetchEntries();
      alert('টেলিফোন ডিরেক্টরির সব এন্ট্রি মুছে ফেলা হয়েছে।');
    } catch (error) {
      console.error('Error clearing telephone directory:', error);
      alert(error instanceof Error ? error.message : 'সব এন্ট্রি মুছতে সমস্যা হয়েছে।');
    } finally {
      setIsClearing(false);
    }
  };

  const templateHeaders = ['name', 'designation', 'division', 'intercom', 'mobile', 'ip_number', 'notes', 'status'];
  const templateSample = ['উদাহরণ নাম', 'সহকারী পরিচালক', 'প্রশাসন বিভাগ', '1234', '01700000000', '10.10.10.10', 'ঐচ্ছিক নোট', 'Active'];
  const templateCsv = `\uFEFF${templateHeaders.join(',')}\n${templateSample.map(toCsvCell).join(',')}`;

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((line) => line.trim());
      if (lines.length < 2) {
        throw new Error('ইমপোর্ট ফাইলে অন্তত একটি ডাটা সারি থাকতে হবে।');
      }

      const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
      const requiredHeaders = ['name', 'designation', 'division', 'intercom', 'mobile', 'ip_number', 'notes', 'status'];
      const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
      if (missingHeaders.length > 0) {
        throw new Error(`নিম্নলিখিত কলামগুলো অনুপস্থিত: ${missingHeaders.join(', ')}`);
      }

      const parsedEntries = lines.slice(1).map((line) => {
        const values = parseCsvLine(line);
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return {
          name: row.name?.trim() || '',
          designation: row.designation?.trim() || '',
          division: row.division?.trim() || '',
          intercom: row.intercom?.trim() || '',
          mobile: row.mobile?.trim() || '',
          ip_number: row.ip_number?.trim() || '',
          notes: row.notes?.trim() || '',
          status: row.status?.trim() === 'Inactive' ? 'Inactive' : 'Active',
        };
      }).filter((entry) => entry.name);

      if (parsedEntries.length === 0) {
        throw new Error('কোনো বৈধ এন্ট্রি পাওয়া যায়নি।');
      }

      const response = await fetch('/api/telephone-directory/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: parsedEntries }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.message || 'ইমপোর্ট সম্পন্ন করা যায়নি।');
      }

      await fetchEntries();
      alert(`${result?.count || parsedEntries.length}টি এন্ট্রি সফলভাবে ইমপোর্ট করা হয়েছে।`);
    } catch (error) {
      console.error('Error importing telephone directory:', error);
      alert(error instanceof Error ? error.message : 'ইমপোর্ট সম্পন্ন করা যায়নি।');
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const filteredEntries = entries.filter((entry) =>
    matchesTextQuery(
      searchTerm,
      entry.name,
      entry.designation,
      entry.division,
      entry.intercom,
      entry.mobile,
      entry.ip_number,
      entry.notes,
      entry.status,
    )
  );

  if (loading) return <div className="py-10 text-center text-xs text-gray-500">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_60%,#f8fafc_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-blue-500">Directory</div>
            <h3 className="mt-2 text-2xl font-bold text-[#1a3a6b]">অভ্যন্তরীণ টেলিফোন ডিরেক্টরি</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              নাম, বিভাগ, পদবি, ইন্টারকম, মোবাইল ও আইপি নম্বর দিয়ে দ্রুত খুঁজুন। অ্যাডমিন এখান থেকেই তথ্য সংযোজন, bulk import এবং হালনাগাদ করতে পারবেন।
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="/telephone-index-2025.pdf"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
            >
              <FileText className="h-4 w-4" />
              মূল PDF দেখুন
            </a>
            {canManage && (
              <>
                <a
                  href={`data:text/csv;charset=utf-8,${encodeURIComponent(templateCsv)}`}
                  download="telephone_directory_template.csv"
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                >
                  <Download className="h-4 w-4" />
                  এক্সেল টেমপ্লেট
                </a>
                <button
                  type="button"
                  onClick={() => importInputRef.current?.click()}
                  disabled={isImporting}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-100 bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Upload className="h-4 w-4" />
                  {isImporting ? 'ইমপোর্ট হচ্ছে...' : 'Excel/CSV ইমপোর্ট'}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAll}
                  disabled={isClearing || entries.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-white px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  {isClearing ? 'মুছে ফেলা হচ্ছে...' : 'সব এন্ট্রি মুছুন'}
                </button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleImport}
                  className="hidden"
                />
              </>
            )}
            {canManage && (
              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1a3a6b] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800"
              >
                <PlusCircle className="h-4 w-4" />
                নতুন এন্ট্রি
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="text-[11px] font-bold text-blue-500">মোট এন্ট্রি</div>
          <div className="mt-2 text-3xl font-black text-[#1a3a6b]">{entries.length}</div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="text-[11px] font-bold text-emerald-500">সক্রিয়</div>
          <div className="mt-2 text-3xl font-black text-emerald-700">{entries.filter((entry) => entry.status === 'Active').length}</div>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <div className="text-[11px] font-bold text-amber-500">বর্তমান ফলাফল</div>
          <div className="mt-2 text-3xl font-black text-amber-700">{filteredEntries.length}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
        {canManage && (
          <p className="mb-3 text-xs text-gray-500">
            টেমপ্লেটটি Excel-এ খুলে তথ্য পূরণ করুন, তারপর CSV হিসেবে save করে ইমপোর্ট করুন।
          </p>
        )}
        <label className="mb-1 block text-[11px] font-bold text-gray-500">ডিরেক্টরি সার্চ</label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="নাম, বিভাগ, পদবি, ইন্টারকম, মোবাইল বা আইপি নম্বর দিয়ে খুঁজুন"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-blue-400"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50/60">
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">নাম</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">পদবি</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">বিভাগ</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">ইন্টারকম</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">মোবাইল</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">আইপি নম্বর</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">অবস্থা</th>
              {canManage && (
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">অ্যাকশন</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredEntries.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-4 align-top">
                  <div className="text-sm font-bold text-gray-900">{entry.name}</div>
                  {entry.notes && <div className="mt-1 max-w-xs text-xs text-gray-500">{entry.notes}</div>}
                </td>
                <td className="px-4 py-4 text-xs text-gray-600">{entry.designation || '-'}</td>
                <td className="px-4 py-4 text-xs text-gray-600">{entry.division || '-'}</td>
                <td className="px-4 py-4 text-xs font-bold text-[#1a3a6b]">{entry.intercom || '-'}</td>
                <td className="px-4 py-4 text-xs text-gray-600">{entry.mobile || '-'}</td>
                <td className="px-4 py-4 text-xs text-gray-600 font-mono">{entry.ip_number || '-'}</td>
                <td className="px-4 py-4">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold text-white ${entry.status === 'Active' ? 'bg-green-500' : 'bg-gray-400'}`}>
                    {entry.status === 'Active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </span>
                </td>
                {canManage && (
                  <td className="px-4 py-4 text-right space-x-2">
                    <button onClick={() => handleOpenModal(entry)} className="text-blue-600 hover:text-blue-800 p-1 transition-colors">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button onClick={() => setConfirmDeleteId(entry.id)} className="text-red-600 hover:text-red-800 p-1 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {filteredEntries.length === 0 && (
              <tr>
                <td colSpan={canManage ? 8 : 7} className="px-4 py-10 text-center text-gray-400 text-xs italic">
                  কোনো টেলিফোন এন্ট্রি খুঁজে পাওয়া যায়নি
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        message="আপনি কি নিশ্চিত যে আপনি এই টেলিফোন এন্ট্রিটি মুছতে চান?"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#1a3a6b] px-6 py-4">
              <h3 className="text-sm font-bold text-white">{editingEntry ? 'ডিরেক্টরি এন্ট্রি এডিট করুন' : 'নতুন ডিরেক্টরি এন্ট্রি'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">নাম</label>
                  <input required value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">পদবি</label>
                  <input value={formData.designation} onChange={(e) => setFormData((prev) => ({ ...prev, designation: e.target.value }))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">বিভাগ</label>
                  <input value={formData.division} onChange={(e) => setFormData((prev) => ({ ...prev, division: e.target.value }))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">ইন্টারকম</label>
                  <input value={formData.intercom} onChange={(e) => setFormData((prev) => ({ ...prev, intercom: e.target.value }))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">মোবাইল</label>
                  <input value={formData.mobile} onChange={(e) => setFormData((prev) => ({ ...prev, mobile: e.target.value }))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">আইপি নম্বর</label>
                  <input value={formData.ip_number} onChange={(e) => setFormData((prev) => ({ ...prev, ip_number: e.target.value }))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="উদা: 10.10.10.10" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-600">অবস্থা</label>
                  <select value={formData.status} onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as 'Active' | 'Inactive' }))} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400">
                    <option value="Active">সক্রিয়</option>
                    <option value="Inactive">নিষ্ক্রিয়</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-600">নোট</label>
                <textarea value={formData.notes} onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))} rows={3} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-gray-50">
                  বাতিল
                </button>
                <button type="submit" className="rounded-xl bg-[#1a3a6b] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800">
                  {editingEntry ? 'হালনাগাদ করুন' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function EmployeeTicTacToe({ userEmail }: { userEmail: string }) {
  const emptyBoard = Array(9).fill(null) as Array<'X' | 'O' | null>;
  const winningLines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];

  const getWinner = (board: Array<'X' | 'O' | null>) => {
    for (const [a, b, c] of winningLines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return null;
  };

  const getDhakaDateKey = () => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date());
  };

  const getUnlockTimeLabel = () => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('bn-BD', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    const local = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
    const next = new Date(local);
    next.setDate(local.getHours() >= 9 ? local.getDate() + 1 : local.getDate());
    next.setHours(9, 0, 0, 0);
    return formatter.format(next);
  };

  const storageKey = `ugc_tictactoe_${userEmail}`;
  const difficultyOptions = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' },
  ] as const;

  const [board, setBoard] = useState<Array<'X' | 'O' | null>>(emptyBoard);
  const [message, setMessage] = useState('আপনি X. মোড নির্বাচন করে খেলা শুরু করুন।');
  const [hasWon, setHasWon] = useState(false);
  const [completedGames, setCompletedGames] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const currentWinner = getWinner(board);
  const isRoundComplete = isLocked || !!currentWinner || board.every(Boolean);

  useEffect(() => {
    const todayKey = getDhakaDateKey();
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      setBoard([...emptyBoard]);
      setCompletedGames(0);
      setHasWon(false);
      setIsLocked(false);
      setDifficulty('medium');
      setMessage('আপনি X. মোড নির্বাচন করে খেলা শুরু করুন।');
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed.dateKey !== todayKey) {
        localStorage.removeItem(storageKey);
        setBoard([...emptyBoard]);
        setCompletedGames(0);
        setHasWon(false);
        setIsLocked(false);
        setMessage('আজকের নতুন চ্যালেঞ্জ শুরু হয়েছে।');
        return;
      }

      setBoard(Array.isArray(parsed.board) ? parsed.board : [...emptyBoard]);
      setCompletedGames(parsed.completedGames || 0);
      setHasWon(!!parsed.hasWon);
      setIsLocked(!!parsed.hasWon);
      setDifficulty(parsed.difficulty === 'easy' || parsed.difficulty === 'hard' ? parsed.difficulty : 'medium');
      setMessage(
        parsed.hasWon
          ? `অভিনন্দন! আপনি ${parsed.completedGames || 0}টি completed game-এর মধ্যে আজ জিতেছেন। আগামীকাল সকাল ৯টায় আবার খুলবে।`
          : 'আপনি X. মোড নির্বাচন করে খেলা শুরু করুন।'
      );
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [userEmail]);

  const persistState = (next: { board: Array<'X' | 'O' | null>; completedGames: number; hasWon: boolean; difficulty?: 'easy' | 'medium' | 'hard' }) => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        dateKey: getDhakaDateKey(),
        board: next.board,
        completedGames: next.completedGames,
        hasWon: next.hasWon,
        difficulty: next.difficulty || difficulty
      })
    );
  };

  const resetBoardOnly = (customMessage = 'নতুন রাউন্ড শুরু হয়েছে। এবার জিতে দেখান।') => {
    setBoard([...emptyBoard]);
    setMessage(customMessage);
  };

  const minimax = (currentBoard: Array<'X' | 'O' | null>, isMaximizing: boolean, depth: number): number => {
    const winner = getWinner(currentBoard);
    if (winner === 'O') return 10 - depth;
    if (winner === 'X') return depth - 10;
    if (currentBoard.every(Boolean)) return 0;

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < currentBoard.length; i += 1) {
        if (!currentBoard[i]) {
          currentBoard[i] = 'O';
          bestScore = Math.max(bestScore, minimax(currentBoard, false, depth + 1));
          currentBoard[i] = null;
        }
      }
      return bestScore;
    }

    let bestScore = Infinity;
    for (let i = 0; i < currentBoard.length; i += 1) {
      if (!currentBoard[i]) {
        currentBoard[i] = 'X';
        bestScore = Math.min(bestScore, minimax(currentBoard, true, depth + 1));
        currentBoard[i] = null;
      }
    }
    return bestScore;
  };

  const getMediumHardMove = (nextBoard: Array<'X' | 'O' | null>) => {
    const availableMoves = nextBoard
      .map((cell, index) => (cell ? null : index))
      .filter((value): value is number => value !== null);

    if (availableMoves.length === 0) return null;

    const moveScores = availableMoves.map((move) => {
      nextBoard[move] = 'O';
      const score = minimax(nextBoard, false, 0);
      nextBoard[move] = null;
      return { move, score };
    });

    moveScores.sort((a, b) => b.score - a.score);
    const topMoves = moveScores.filter((item) => item.score >= moveScores[0].score - 1);
    return topMoves[Math.floor(Math.random() * topMoves.length)]?.move ?? moveScores[0].move;
  };

  const getEasyMove = (nextBoard: Array<'X' | 'O' | null>) => {
    const availableMoves = nextBoard
      .map((cell, index) => (cell ? null : index))
      .filter((value): value is number => value !== null);

    if (availableMoves.length === 0) return null;
    return availableMoves[Math.floor(Math.random() * availableMoves.length)] ?? null;
  };

  const getComputerMove = (nextBoard: Array<'X' | 'O' | null>) => {
    if (difficulty === 'easy') {
      return getEasyMove(nextBoard);
    }

    if (difficulty === 'hard') {
      const availableMoves = nextBoard
        .map((cell, index) => (cell ? null : index))
        .filter((value): value is number => value !== null);

      if (availableMoves.length === 0) return null;

      let bestScore = -Infinity;
      let bestMove = availableMoves[0];
      for (const move of availableMoves) {
        nextBoard[move] = 'O';
        const score = minimax(nextBoard, false, 0);
        nextBoard[move] = null;
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
      return bestMove;
    }

    return getMediumHardMove(nextBoard);
  };

  const handleCellClick = (index: number) => {
    if (board[index] || hasWon || isRoundComplete) return;

    const nextBoard = [...board];
    nextBoard[index] = 'X';

    if (getWinner(nextBoard) === 'X') {
      const nextCompletedGames = completedGames + 1;
      setBoard(nextBoard);
      setCompletedGames(nextCompletedGames);
      setHasWon(true);
      setIsLocked(true);
      setMessage(`অভিনন্দন! ${nextCompletedGames}টি completed game-এর মধ্যে আপনি আজ জিতেছেন। আগামীকাল সকাল ৯টায় আবার খুলবে।`);
      persistState({ board: nextBoard, completedGames: nextCompletedGames, hasWon: true });
      return;
    }

    if (nextBoard.every(Boolean)) {
      const nextCompletedGames = completedGames + 1;
      setBoard(nextBoard);
      setCompletedGames(nextCompletedGames);
      setMessage(`ড্র হয়েছে। এখন পর্যন্ত completed game ${nextCompletedGames}টি। আবার চেষ্টা করুন।`);
      persistState({ board: nextBoard, completedGames: nextCompletedGames, hasWon: false });
      return;
    }

    const computerMove = getComputerMove(nextBoard);
    if (computerMove !== null) {
      nextBoard[computerMove] = 'O';
    }

    if (getWinner(nextBoard) === 'O') {
      const nextCompletedGames = completedGames + 1;
      setBoard(nextBoard);
      setCompletedGames(nextCompletedGames);
      setMessage(`এই রাউন্ডে কম্পিউটার জিতেছে। এখন পর্যন্ত completed game ${nextCompletedGames}টি। আবার খেলুন।`);
      persistState({ board: nextBoard, completedGames: nextCompletedGames, hasWon: false });
      return;
    }

    if (nextBoard.every(Boolean)) {
      const nextCompletedGames = completedGames + 1;
      setBoard(nextBoard);
      setCompletedGames(nextCompletedGames);
      setMessage(`ড্র হয়েছে। এখন পর্যন্ত completed game ${nextCompletedGames}টি। আবার চেষ্টা করুন।`);
      persistState({ board: nextBoard, completedGames: nextCompletedGames, hasWon: false });
      return;
    }

    setBoard(nextBoard);
    setMessage('এখন আপনার চাল দিন।');
    persistState({ board: nextBoard, completedGames, hasWon: false });
  };

  return (
    <div className={`rounded-3xl border p-4 shadow-sm ${isLocked ? 'border-slate-200 bg-slate-100/90' : 'border-blue-100 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)]'}`}>
      <div className="mb-4">
        <p className="text-[11px] font-bold text-blue-500">ছোট্ট বিরতি</p>
        <h3 className="mt-1 text-base font-bold text-gray-900">Tic Tac Toe</h3>
        <p className="mt-1 text-xs leading-5 text-gray-500">{message}</p>
        <p className="mt-2 text-[11px] font-bold text-gray-600">Number of games played: {completedGames}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {difficultyOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                if (isLocked) return;
                setDifficulty(option.value);
                persistState({ board, completedGames, hasWon, difficulty: option.value });
              }}
              className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
                difficulty === option.value ? 'bg-[#1a3a6b] text-white' : 'border border-gray-200 bg-white text-gray-600'
              } ${isLocked ? 'cursor-not-allowed opacity-60' : 'hover:border-blue-300 hover:text-blue-700'}`}
              disabled={isLocked}
            >
              {option.label}
            </button>
          ))}
        </div>
        {isLocked && (
          <p className="mt-2 text-[11px] font-bold text-slate-500">পরবর্তী খেলা খুলবে: {getUnlockTimeLabel()}</p>
        )}
      </div>

      <div className={`grid grid-cols-3 gap-2 ${isRoundComplete ? 'opacity-55' : ''}`}>
        {board.map((cell, index) => (
          <button
            key={index}
            type="button"
            onClick={() => handleCellClick(index)}
            className={`flex aspect-square items-center justify-center rounded-2xl border bg-white text-2xl font-black shadow-sm transition disabled:cursor-not-allowed ${isLocked ? 'border-slate-200 text-slate-400' : 'border-blue-100 hover:border-blue-300 hover:bg-blue-50'} ${cell === 'X' ? 'text-green-600' : cell === 'O' ? 'text-red-600' : 'text-[#1a3a6b]'}`}
            disabled={!!cell || hasWon || isRoundComplete}
          >
            {cell}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          if (isLocked) return;
          setHasWon(false);
          persistState({ board: [...emptyBoard], completedGames, hasWon: false });
          resetBoardOnly();
        }}
        disabled={isLocked}
        className={`mt-4 w-full rounded-2xl px-4 py-2.5 text-xs font-bold transition ${isLocked ? 'bg-slate-300 text-slate-500' : 'bg-[#1a3a6b] text-white hover:bg-blue-800'}`}
      >
        {isLocked ? 'আজকের জন্য সম্পন্ন' : isRoundComplete ? 'নতুন রাউন্ড' : 'আবার খেলুন'}
      </button>
    </div>
  );
}

const parseCategoryProblemDetails = (value?: string): Record<string, string> => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.error('Error parsing category problem details:', error);
    return {};
  }
};

const parseOfficerActionDetails = (value?: string): OfficerActionDetailsMap => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.error('Error parsing officer action details:', error);
    return {};
  }
};

function ApplicationViewModal({
  app,
  onClose,
  currentUser,
  onApplicationUpdated,
  autoPrint = false,
  allowOfficerActions = true
}: {
  app: Application,
  onClose: () => void,
  currentUser?: UserData,
  onApplicationUpdated?: () => void,
  autoPrint?: boolean,
  allowOfficerActions?: boolean
}) {
  const systemSettings = useSystemSettings();
  const branding = systemSettings.formBranding;
  const officerCategoryMap = getOfficerCategoryMap(systemSettings);
  const officerRoleLabelMap = getOfficerRoleLabelMap(systemSettings);
  const providerRoleLabelMap = getServiceProviderRoleLabelMap(systemSettings);
  const activeManagedCategories = getActiveManagedCategories(systemSettings);
  const categoryLabelMap = activeManagedCategories.reduce<Record<string, string>>((acc, category) => {
    acc[category.key] = category.label || category.key;
    return acc;
  }, {});
  const [users, setUsers] = useState<UserListItem[]>([]);
  const categoryProblemDetails = parseCategoryProblemDetails(app.category_problem_details);
  const officerActionDetails = parseOfficerActionDetails(app.officer_action_details);
  const categoryProblemEntries = Object.entries(categoryProblemDetails).filter(([, detail]) => `${detail}`.trim());
  const serviceEntries = getServiceEntries(app.service_type);
  const relevantOfficerRoles = getRelevantOfficerRolesForServiceType(app.service_type, systemSettings);
  const printSheetRef = useRef<HTMLDivElement>(null);
  const currentDeskOfficerRole = currentUser?.role && currentUser.role.startsWith('desk_officer_') ? currentUser.role : '';
  const currentProviderRoles = getProviderOfficerRolesFromPermissions(currentUser?.permissions || [], systemSettings, relevantOfficerRoles);
  const defaultProviderRole = currentProviderRoles.find((role) => {
    const assignments = getRoleItemAssignments(officerActionDetails, role);
    return assignments.some((assignment) => assignment.provider_email === currentUser?.email);
  }) || currentProviderRoles[0] || '';
  const currentOfficerRole = currentDeskOfficerRole || defaultProviderRole;
  const viewerIsServiceProvider = !!defaultProviderRole && !currentDeskOfficerRole;
  const scopedCategoryKey = currentOfficerRole ? officerCategoryMap[currentOfficerRole] || '' : '';
  const currentRoleProviderAssignment = currentOfficerRole && currentUser?.email
    ? getRoleItemAssignments(officerActionDetails, currentOfficerRole).find((assignment) => assignment.provider_email === currentUser.email)
    : undefined;
  const currentRoleAssignedItems = currentRoleProviderAssignment?.assigned_items || [];
  const scopedServiceEntries = viewerIsServiceProvider && scopedCategoryKey
    ? serviceEntries.filter((entry) => {
      if (entry.category !== scopedCategoryKey) return false;
      if (!entry.detail) return true;
      if (systemSettings.requestTypes.includes(entry.detail)) return true;
      if (currentRoleAssignedItems.length === 0) return true;
      return currentRoleAssignedItems.includes(entry.detail);
    })
    : serviceEntries;
  const scopedRelevantOfficerRoles = viewerIsServiceProvider && currentOfficerRole
    ? relevantOfficerRoles.filter((role) => role === currentOfficerRole)
    : relevantOfficerRoles;
  const scopedManagedCategories = viewerIsServiceProvider && scopedCategoryKey
    ? activeManagedCategories.filter((category) => category.key === scopedCategoryKey)
    : activeManagedCategories;
  const visibleCategoryProblemEntries =
    currentOfficerRole && officerCategoryMap[currentOfficerRole]
      ? categoryProblemEntries.filter(([category]) => category === officerCategoryMap[currentOfficerRole])
      : categoryProblemEntries;
  const hasSelfAssignmentForCurrentRole = !!currentDeskOfficerRole
    && currentOfficerRole === currentDeskOfficerRole
    && !!currentRoleProviderAssignment
    && currentRoleProviderAssignment.provider_email === currentUser?.email;
  const getRemainingRoleItems = (role: string) =>
    getRoleSelectedItems(app.service_type, role, systemSettings)
      .filter((item) => !getRoleItemAssignments(officerActionDetails, role).flatMap((assignment) => assignment.assigned_items).includes(item));
  const isProviderContextForRole = (role: string) => {
    if (viewerIsServiceProvider && currentOfficerRole === role) return true;
    if (!hasSelfAssignmentForCurrentRole || currentOfficerRole !== role) return false;
    return getRemainingRoleItems(role).length === 0;
  };
  const getInitialOfficerDrafts = () => {
    const drafts: Record<string, OfficerActionDraft> = {};
    const isModernFormat = Object.keys(officerActionDetails).length > 0;
    scopedRelevantOfficerRoles.forEach((role) => {
      const roleDetails = officerActionDetails[role] || {};
      let useLegacyFallback = false;
      if (!isModernFormat && !roleDetails.officer_name && !roleDetails.officer_designation && !roleDetails.officer_service_info && !roleDetails.status) {
        useLegacyFallback = !!(app.officer_name || app.officer_designation || app.officer_service_info);
      }
      const providerContext = isProviderContextForRole(role);
      const deskOfficerContext = !!currentDeskOfficerRole && currentDeskOfficerRole === role;
      const storedOfficerName = roleDetails.officer_name && roleDetails.officer_name !== roleDetails.desk_officer_name
        ? roleDetails.officer_name
        : '';
      drafts[role] = {
        officer_name: providerContext
          ? currentRoleProviderAssignment?.officer_name || currentRoleProviderAssignment?.provider_name || storedOfficerName
          : storedOfficerName || (useLegacyFallback && app.officer_name ? app.officer_name : ''),
        officer_designation: providerContext
          ? currentRoleProviderAssignment?.officer_designation || currentRoleProviderAssignment?.provider_designation || roleDetails.officer_designation || ''
          : roleDetails.officer_designation || (useLegacyFallback && app.officer_designation ? app.officer_designation : ''),
        officer_service_info: providerContext
          ? currentRoleProviderAssignment?.officer_service_info || ''
          : roleDetails.officer_service_info || (useLegacyFallback && app.officer_service_info ? app.officer_service_info : ''),
        status: providerContext
          ? currentRoleProviderAssignment?.status || roleDetails.status || app.status || 'Forwarded for Approval'
          : roleDetails.status || (useLegacyFallback && app.status ? app.status : 'Forwarded for Approval'),
        assigned_items: deskOfficerContext
          ? []
          : providerContext
          ? currentRoleProviderAssignment?.assigned_items || []
          : Array.isArray(roleDetails.assigned_items)
            ? roleDetails.assigned_items
            : (deskOfficerContext ? [] : getAssignedItemsForRole(app, role, systemSettings, officerActionDetails)),
        provider_email: deskOfficerContext
          ? ''
          : providerContext
          ? currentRoleProviderAssignment?.provider_email || ''
          : roleDetails.provider_email || '',
        provider_name: deskOfficerContext
          ? ''
          : providerContext
          ? currentRoleProviderAssignment?.provider_name || ''
          : roleDetails.provider_name || '',
        provider_designation: deskOfficerContext
          ? ''
          : providerContext
          ? currentRoleProviderAssignment?.provider_designation || ''
          : roleDetails.provider_designation || '',
        provider_role: providerContext
          ? currentRoleProviderAssignment?.provider_role || getServiceProviderRoleForOfficerRole(role)
          : roleDetails.provider_role || getServiceProviderRoleForOfficerRole(role),
      };
    });
    return drafts;
  };
  const [officerDrafts, setOfficerDrafts] = useState<Record<string, OfficerActionDraft>>(getInitialOfficerDrafts);
  const [statusMessages, setStatusMessages] = useState<Record<string, string>>({});
  const [submittingRoles, setSubmittingRoles] = useState<Record<string, boolean>>({});
  const isDeskOfficer = !!currentDeskOfficerRole;
  const hasRemainingItemsForCurrentRole = !!currentOfficerRole && getRemainingRoleItems(currentOfficerRole).length > 0;
  const isServiceProvider = viewerIsServiceProvider || (hasSelfAssignmentForCurrentRole && !hasRemainingItemsForCurrentRole);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/officer-directory');
        if (!response.ok) {
          throw new Error(`Failed to fetch officers: ${response.status}`);
        }
        const data = await response.json();
        setUsers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching users for officer lookup:', error);
      }
    };

    fetchUsers();
  }, []);

  const getOfficerNameByRole = (role: string, fallback?: string) => {
    const matchedUser = users.find((item) => item.role === role && item.status === 'Active');
    return matchedUser?.name_bn || matchedUser?.name || fallback || '';
  };

  const getOfficerRoleLabel = (label: string) => {
    return officerRoleLabelMap[label] || label;
  };

  const getProviderCandidates = (role: string) => {
    const providerRole = getServiceProviderRoleForOfficerRole(role);
    return users.filter((item) => {
      if (item.status !== 'Active') return false;
      const effectivePermissions = Array.from(new Set([
        ...(item.permissions || []),
        ...(item.extra_permissions || []),
      ].filter((permission) => !(item.denied_permissions || []).includes(permission))));
      return item.role === providerRole || effectivePermissions.includes(providerRole);
    });
  };

  const handlePrintApplication = () => {
    if (!printSheetRef.current) return;

    const printWindow = window.open('', '_blank', 'width=1100,height=900');
    if (!printWindow) {
      alert('প্রিন্ট ফরম খোলা যায়নি। অনুগ্রহ করে পপ-আপ অনুমতি দিন।');
      return;
    }

    const inheritedHead = document.head.innerHTML;
    const printStyles = `
      <style>
        @page { size: A4 portrait; margin: 6mm; }
        body {
          margin: 0;
          padding: 0;
          background: #fff;
          font-family: "Noto Sans Bengali", "Inter", sans-serif;
          color: #000;
        }
        .app-view-print-sheet {
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
          padding: 12px 14px;
          box-sizing: border-box;
          background: #fff;
          border: none !important;
          box-shadow: none !important;
          font-family: "Noto Sans Bengali", "Inter", sans-serif;
          color: #000;
        }
        .app-view-print-sheet img { max-height: 56px; }
        .app-view-print-sheet table { width: 100%; border-collapse: collapse; page-break-inside: avoid; }
        .app-view-print-sheet tr { page-break-inside: avoid; }
        .app-view-print-sheet .shadow-sm,
        .app-view-print-sheet .rounded-xl { box-shadow: none !important; border-radius: 0 !important; }
        .app-view-print-sheet .border { border-color: #000 !important; }
        .app-view-print-sheet p,
        .app-view-print-sheet span,
        .app-view-print-sheet div,
        .app-view-print-sheet td,
        .app-view-print-sheet th { line-height: 1.2 !important; }
        .app-view-print-sheet .grid { gap: 8px 16px !important; }
        .app-view-print-sheet .space-y-6 > * + * { margin-top: 12px !important; }
        .app-view-print-sheet .mb-8 { margin-bottom: 14px !important; }
        .app-view-print-sheet .mb-6 { margin-bottom: 10px !important; }
        .app-view-print-sheet .mb-3 { margin-bottom: 8px !important; }
        .app-view-print-sheet .mb-2 { margin-bottom: 6px !important; }
        .app-view-print-sheet .mt-12 { margin-top: 24px !important; }
        .app-view-print-sheet .mt-10 { margin-top: 18px !important; }
        .app-view-print-sheet .pt-10 { padding-top: 16px !important; }
        .app-view-print-sheet .p-10 { padding: 14px !important; }
        .app-view-print-sheet .p-8 { padding: 10px !important; }
        .app-view-print-sheet .p-6 { padding: 10px !important; }
        .app-view-print-sheet .p-3 { padding: 8px !important; }
        .app-view-print-sheet .py-2 { padding-top: 4px !important; padding-bottom: 4px !important; }
        .app-view-print-sheet .px-4 { padding-left: 8px !important; padding-right: 8px !important; }
        .app-view-print-sheet .h-20 { height: 56px !important; }
        .app-view-print-sheet .text-2xl { font-size: 20px !important; }
        .app-view-print-sheet .text-lg { font-size: 15px !important; }
        .app-view-print-sheet .text-sm { font-size: 12px !important; }
        .app-view-print-sheet .text-xs { font-size: 10px !important; }
        .app-view-print-sheet .text-\\[11px\\] { font-size: 9px !important; }
        .app-view-print-sheet .text-\\[10px\\] { font-size: 8px !important; }
        .app-view-print-sheet .text-\\[8px\\] { font-size: 7px !important; }
        .app-view-print-sheet .text-\\[7px\\] { font-size: 6px !important; }
        .app-view-print-sheet .min-h-\\[1000px\\] { min-height: auto !important; }
        .app-view-print-sheet .min-h-\\[100px\\] { min-height: 70px !important; }
        .app-view-print-sheet .min-h-\\[60px\\] { min-height: 40px !important; }
      </style>
    `;

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${branding.formTitle}</title>
          ${inheritedHead}
          ${printStyles}
        </head>
        <body>
          ${printSheetRef.current.outerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  useEffect(() => {
    if (!autoPrint || users.length === 0) return;
    const timer = window.setTimeout(() => {
      handlePrintApplication();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [autoPrint, users.length]);

  useEffect(() => {
    setOfficerDrafts(getInitialOfficerDrafts());
    setStatusMessages({});
    setSubmittingRoles({});
  }, [app.id, app.status, app.officer_action_details]);

  const handleOfficerDraftChange = (role: string, field: keyof OfficerActionDraft, value: string) => {
    setOfficerDrafts((prev) => ({
      ...prev,
      [role]: {
        ...(prev[role] || {
          officer_name: '',
          officer_designation: '',
          officer_service_info: '',
          status: 'Forwarded for Approval',
          assigned_items: [],
        }),
        [field]: value,
      }
    }));
  };

  const handleAssignedItemsChange = (role: string, item: string, checked: boolean) => {
    setOfficerDrafts((prev) => {
      const currentItems = prev[role]?.assigned_items || [];
      const nextItems = checked
        ? Array.from(new Set([...currentItems, item]))
        : currentItems.filter((currentItem) => currentItem !== item);

      return {
        ...prev,
        [role]: {
          ...(prev[role] || {
            officer_name: '',
            officer_designation: '',
            officer_service_info: '',
            status: 'Forwarded for Approval',
            assigned_items: [],
          }),
          assigned_items: nextItems,
        }
      };
    });
  };

  const handleProviderSelection = (role: string, email: string) => {
    const providerRole = getServiceProviderRoleForOfficerRole(role);
    const fallbackDesignation = providerRoleLabelMap[providerRole] || 'Service Provider';
    const provider = email === currentUser?.email
      ? {
          email: currentUser.email,
          name: currentUser.name || '',
          name_bn: currentUser.name_bn || currentUser.name || '',
          designation: fallbackDesignation,
          role: providerRole,
        }
      : getProviderCandidates(role).find((item) => item.email === email);
    const resolvedProviderRole = provider?.role || providerRole;
    const resolvedDesignation = provider?.designation || providerRoleLabelMap[resolvedProviderRole] || fallbackDesignation;
    setOfficerDrafts((prev) => ({
      ...prev,
      [role]: {
        ...(prev[role] || {
          officer_name: '',
          officer_designation: '',
          officer_service_info: '',
          status: 'Forwarded for Approval',
        }),
        provider_email: provider?.email || '',
        provider_name: provider?.name_bn || provider?.name || '',
        provider_designation: resolvedDesignation,
        provider_role: resolvedProviderRole,
        officer_name: provider?.name_bn || provider?.name || prev[role]?.officer_name || '',
        officer_designation: resolvedDesignation || prev[role]?.officer_designation || '',
      }
    }));
  };

  const handleOfficerActionSubmit = async (role: string) => {
    const remainingRoleItems = getRemainingRoleItems(role);
    const hasExistingSelfAssignment = !!currentUser?.email
      && getRoleItemAssignments(officerActionDetails, role).some((assignment) => assignment.provider_email === currentUser.email);
    const isSelfAssignedStatusUpdate = !!currentDeskOfficerRole
      && currentDeskOfficerRole === role
      && hasExistingSelfAssignment
      && remainingRoleItems.length === 0;
    const isProviderSubmitter = isProviderContextForRole(role)
      || (role === currentOfficerRole && isServiceProvider)
      || isSelfAssignedStatusUpdate;
    if (isProviderSubmitter && !currentUser?.signature) {
      setStatusMessages((prev) => ({
        ...prev,
        [role]: 'স্বাক্ষর আপলোড ছাড়া অবস্থা পরিবর্তন করা যাবে না'
      }));
      return;
    }

    const draft = officerDrafts[role] || {
      officer_name: '',
      officer_designation: '',
      officer_service_info: '',
      status: app.status,
      assigned_items: [],
    };
    const isSelfAssigned = !isProviderSubmitter && !!currentUser?.email && draft.provider_email === currentUser.email;
    const selectedItemsForSubmit = isProviderSubmitter
      ? draft.assigned_items || []
      : (draft.assigned_items || []).filter((item) => remainingRoleItems.includes(item));

    if (!isProviderSubmitter && !isSelfAssigned && !`${draft.provider_email || ''}`.trim()) {
      setStatusMessages((prev) => ({
        ...prev,
        [role]: 'অনুগ্রহ করে একজন সেবা প্রদানকারী নির্বাচন করুন।'
      }));
      return;
    }

    if (!isProviderSubmitter && !selectedItemsForSubmit.length) {
      setStatusMessages((prev) => ({
        ...prev,
        [role]: 'কমপক্ষে একটি আইটেম নির্বাচন করুন।'
      }));
      return;
    }

    setSubmittingRoles((prev) => ({ ...prev, [role]: true }));
    setStatusMessages((prev) => ({ ...prev, [role]: '' }));

    try {
      const resp = await fetch(`/api/applications/${app.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: isProviderSubmitter ? draft.status : (isSelfAssigned ? 'In Progress' : 'Forwarded for Approval'),
          as_service_provider: isProviderSubmitter,
          as_self_assignment: isSelfAssigned,
          officer_signature: currentUser.signature || null,
          officer_signed_at: currentUser.signature ? new Date().toLocaleString('bn-BD') : null,
          officer_name: (draft.officer_name || draft.provider_name || '').trim(),
          desk_officer_name: currentUser.name_bn,
          officer_designation: draft.officer_designation || draft.provider_designation || providerRoleLabelMap[draft.provider_role || getServiceProviderRoleForOfficerRole(role)] || '',
          officer_service_info: isProviderSubmitter ? draft.officer_service_info : '',
          officer_role: role,
          assigned_items: selectedItemsForSubmit,
          provider_email: isSelfAssigned ? (currentUser?.email || '') : (draft.provider_email || ''),
          provider_name: isSelfAssigned ? (currentUser?.name_bn || currentUser?.name || '') : (draft.provider_name || draft.officer_name || ''),
          provider_designation: isSelfAssigned
            ? (draft.provider_designation || draft.officer_designation || providerRoleLabelMap[draft.provider_role || getServiceProviderRoleForOfficerRole(role)] || '')
            : (draft.provider_designation || draft.officer_designation || providerRoleLabelMap[draft.provider_role || getServiceProviderRoleForOfficerRole(role)] || ''),
          provider_role: draft.provider_role || getServiceProviderRoleForOfficerRole(role)
        })
      });
      if (!resp.ok) {
        const errorPayload = await resp.json().catch(() => null);
        throw new Error(errorPayload?.message || `Server returned ${resp.status}`);
      }
      const payload = await resp.json().catch(() => null);

      setStatusMessages((prev) => ({
        ...prev,
        [role]: payload?.message || (isProviderSubmitter ? 'অবস্থা সফলভাবে আপডেট করা হয়েছে।' : 'সেবা প্রদানকারীর কাছে আবেদন প্রেরণ করা হয়েছে।')
      }));
      if (!isProviderSubmitter) {
        setOfficerDrafts((prev) => ({
          ...prev,
          [role]: {
            officer_name: '',
            officer_designation: '',
            officer_service_info: '',
            status: 'Forwarded for Approval',
            assigned_items: [],
            provider_email: '',
            provider_name: '',
            provider_designation: '',
            provider_role: getServiceProviderRoleForOfficerRole(role),
          }
        }));
      }
      onApplicationUpdated?.();
    } catch (error) {
      console.error('Error updating officer action from modal:', error);
      setStatusMessages((prev) => ({
        ...prev,
        [role]: error instanceof Error ? error.message : 'অবস্থা আপডেট করার সময় একটি সমস্যা হয়েছে।'
      }));
    } finally {
      setSubmittingRoles((prev) => ({ ...prev, [role]: false }));
    }
  };

  const getOfficerSlotData = (role: string) => {
    const roleDetails = officerActionDetails[role] || {};
    const hasModernRoleData = Boolean(
      roleDetails.desk_signature ||
      roleDetails.signature ||
      roleDetails.legacy_signature ||
      roleDetails.desk_signed_at ||
      roleDetails.updated_at ||
      roleDetails.desk_officer_name ||
      roleDetails.officer_name ||
      roleDetails.officer_designation ||
      roleDetails.officer_service_info ||
      roleDetails.status
    );
    const fallbackSignature = hasModernRoleData ? app.officer_signature : null;
    const fallbackSignedAt = hasModernRoleData ? app.officer_signed_at : null;
    const deskSignature = roleDetails.desk_signature || roleDetails.signature || fallbackSignature || roleDetails.legacy_signature || null;
    const deskSignedAt = roleDetails.desk_signed_at || roleDetails.updated_at || fallbackSignedAt || null;
    if (role === 'desk_officer_hardware') {
      return {
        sig: deskSignature || app.hw_officer_sig,
        date: deskSignedAt || app.hw_officer_date,
        name: roleDetails.desk_officer_name || app.hw_officer_name,
        label: role,
        providerSig: roleDetails.provider_signature || null,
        providerDate: roleDetails.provider_signed_at || null,
      };
    }
    if (role === 'desk_officer_network') {
      return {
        sig: deskSignature || app.nw_officer_sig,
        date: deskSignedAt || app.nw_officer_date,
        name: roleDetails.desk_officer_name || app.nw_officer_name,
        label: role,
        providerSig: roleDetails.provider_signature || null,
        providerDate: roleDetails.provider_signed_at || null,
      };
    }
    if (role === 'desk_officer_software') {
      return {
        sig: deskSignature || app.sw_officer_sig,
        date: deskSignedAt || app.sw_officer_date,
        name: roleDetails.desk_officer_name || app.sw_officer_name,
        label: role,
        providerSig: roleDetails.provider_signature || null,
        providerDate: roleDetails.provider_signed_at || null,
      };
    }
    return {
      sig: deskSignature || app.mnt_officer_sig,
      date: deskSignedAt || app.mnt_officer_date,
      name: roleDetails.desk_officer_name || app.mnt_officer_name,
      label: role,
      providerSig: roleDetails.provider_signature || null,
      providerDate: roleDetails.provider_signed_at || null,
    };
  };

  return (
    <div className="app-view-modal fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="app-view-modal-shell bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="app-view-modal-header bg-[#1a3a6b] px-6 py-4 flex justify-between items-center shrink-0">
          <h3 className="text-white font-bold text-sm">আবেদনের বিস্তারিত</h3>
          <div className="flex items-center gap-4">
            <button onClick={handlePrintApplication} className="text-white hover:text-gray-200 flex items-center gap-2 text-xs font-bold">
              <Printer className="w-4 h-4" /> প্রিন্ট / PDF
            </button>
            <button onClick={onClose} className="text-white hover:text-gray-200">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="app-view-modal-body p-8 overflow-auto flex-1 bg-gray-50">
          <div ref={printSheetRef} className="app-view-print-sheet bg-white p-10 shadow-sm border border-gray-200 mx-auto w-[800px] min-h-[1000px] relative font-[Inter]">
            {/* Header */}
            <div className="relative min-h-[132px] border-b-2 border-black pb-4 mb-6">
              <img src={branding.logoUrl} alt="Logo" className="absolute left-0 top-0 h-20" />
              <div className="mx-auto max-w-[430px] pt-1 text-center">
                <h1 className="text-2xl font-bold font-[Nikosh]">{branding.headerTitleBn}</h1>
                <p className="text-sm font-bold">{branding.headerTitleEn}</p>
                <p className="text-xs">{branding.headerAddress}</p>
                <p className="text-xs font-bold">{branding.headerWebsite}</p>
              </div>
              <div className="absolute bottom-4 right-0 text-right text-xs text-purple-800 font-bold">
                {app.tracking_no}
              </div>
            </div>

            <h2 className="text-center text-lg font-bold underline mb-8">{branding.formTitle}</h2>

            <div className="border border-black p-6 space-y-6">
              <div className="grid grid-cols-2 gap-y-4 text-sm">
                <div className="flex gap-2"><b>আবেদনকারীর নাম:</b> <span className="border-b border-black flex-1">{app.user_name}</span></div>
                <div className="flex gap-2"><b>পদবী:</b> <span className="border-b border-black flex-1">{app.designation}</span></div>
                <div className="flex gap-2"><b>বিভাগ/দপ্তর:</b> <span className="border-b border-black flex-1">{app.division}</span></div>
                <div className="flex gap-2"><b>মোবাইল:</b> <span className="border-b border-black flex-1">{app.mobile}</span></div>
              </div>

              <div>
                <p className="text-sm font-bold mb-2">সেবার ধরণ:</p>
                <div className="hidden">
                  {Object.entries(officerCategoryMap)
                    .filter(([, category]) => app.service_type.includes(category))
                    .map(([role]) => (
                      <span key={role} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-bold text-blue-700">
                        দায়িত্বপ্রাপ্ত কর্মকর্তা: {getOfficerNameByRole(role, getOfficerRoleLabel(role))}
                      </span>
                    ))}
                </div>
            <div className="border border-black rounded overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 border-b border-black">
                      <tr>
                        <th className="px-4 py-2 font-bold border-r border-black w-1/4">ক্যাটাগরি</th>
                        <th className="px-4 py-2 font-bold border-r border-black w-1/4 text-center">নতুন সরবরাহ</th>
                        <th className="px-4 py-2 font-bold border-r border-black w-1/4 text-center">মেরামত/সেবা প্রদান</th>
                        <th className="px-4 py-2 font-bold w-1/4">সেবাসমূহ (আইটেম)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black">
                  {scopedManagedCategories.map((category) => {
                        const isNew = systemSettings.requestTypes[0] ? app.service_type.includes(`${category.key} - ${systemSettings.requestTypes[0]}`) : false;
                        const isRepair = systemSettings.requestTypes[1] ? app.service_type.includes(`${category.key} - ${systemSettings.requestTypes[1]}`) : false;
                        const items = scopedServiceEntries
                          .filter((entry) => entry.category === category.key && entry.detail && !systemSettings.requestTypes.includes(entry.detail))
                          .map((entry) => entry.detail);
                        
                        if (!isNew && !isRepair && items.length === 0) return null;

                        return (
                          <tr key={category.id}>
                            <td className="px-4 py-2 border-r border-black font-semibold">{category.label}</td>
                            <td className="px-4 py-2 border-r border-black text-center font-bold text-lg">{isNew ? '✓' : ''}</td>
                            <td className="px-4 py-2 border-r border-black text-center font-bold text-lg">{isRepair ? '✓' : ''}</td>
                            <td className="px-4 py-2">
                              {items.length > 0 ? items.join(', ') : <span className="text-xs text-gray-500">কোন আইটেম নির্বাচন করা হয়নি</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <p className="text-sm font-bold mb-1">সমস্যার বিবরণ :</p>
                {visibleCategoryProblemEntries.length > 0 ? (
                  <div
                    className="w-full border border-black min-h-[100px] text-sm"
                    style={{ display: 'grid', gridTemplateColumns: `repeat(${visibleCategoryProblemEntries.length}, minmax(0, 1fr))` }}
                  >
                    {visibleCategoryProblemEntries.map(([category, detail], index) => (
                      <div
                        key={category}
                        className={`${index < visibleCategoryProblemEntries.length - 1 ? 'border-r border-black' : ''}`}
                      >
                        <div className="px-3 pt-2 font-bold">
                          {categoryLabelMap[category] || category}
                        </div>
                        <div className="px-3 pb-3 pt-1 whitespace-pre-wrap">{detail}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-black p-3 min-h-[100px] text-sm whitespace-pre-wrap">
                    {app.problem_details}
                  </div>
                )}
              </div>

              <div className="flex justify-between mt-12 pt-10">
                <div className="text-center w-[45%] border-t border-black pt-2 relative">
                  {app.applicant_signature && (
                    <img src={app.applicant_signature} alt="Signature" className="absolute bottom-full left-1/2 -translate-x-1/2 h-6 mb-2" />
                  )}
                  <p className="text-[10px] text-gray-500">{app.applicant_signed_at}</p>
                  <p className="text-xs font-bold">আবেদনকারীর স্বাক্ষর ও তারিখ</p>
                </div>
                <div className="text-center w-[45%] border-t border-black pt-2 relative">
                  {app.div_head_signature && (
                    <img src={app.div_head_signature} alt="Signature" className="absolute bottom-full left-1/2 -translate-x-1/2 h-6 mb-2" />
                  )}
                  <p className="text-[10px] text-gray-500">{app.div_head_signed_at}</p>
                  <p className="text-xs font-bold">সংশ্লিষ্ট বিভাগীয় প্রধানের স্বাক্ষর ও তারিখ</p>
                </div>
              </div>
            </div>

            <div className="mt-16 border-t-2 border-dashed border-gray-300 pt-8">
              <p className="text-sm font-bold mb-4">আইসিটি বিভাগ কর্তৃক পূরণীয়:</p>
              <div className="border border-black px-6 pt-8 pb-6">
                <div className={`grid gap-3 mb-6 pt-1 ${scopedRelevantOfficerRoles.length > 1 ? 'grid-cols-4' : 'grid-cols-1'}`}>
                  {scopedRelevantOfficerRoles.map((role, idx) => {
                    const item = { cat: officerCategoryMap[role], role };
                    const slot = getOfficerSlotData(item.role);
                    const isRelevant = !!item.cat && (viewerIsServiceProvider ? item.role === currentOfficerRole : app.service_type.includes(item.cat || ''));
                    if (!isRelevant) return <div key={idx}></div>;
                    const displayOfficerName = slot.name || getOfficerNameByRole(item.role);
                    return (
                      <div key={idx} className="text-center text-[9px] font-bold">
                        <div className="min-h-[24px] mb-0.5 flex items-end justify-center">
                          {slot.sig ? (
                            <img src={slot.sig} alt="Officer Signature" className="h-6 object-contain" />
                          ) : null}
                        </div>
                        <div className="border-t border-black pt-0.5">
                          <span className="block min-h-[12px]">
                            {displayOfficerName || ''}
                          </span>
                          <span className="block text-[8px] font-normal leading-tight">
                            {getOfficerRoleLabel(item.role)}
                          </span>
                          {slot.date && (
                            <span className="block text-[7px] font-normal whitespace-nowrap">
                              {slot.date}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-4">
                  {scopedRelevantOfficerRoles.map((role) => {
                    const roleDetails = officerActionDetails[role] || {};
                    const slot = getOfficerSlotData(role);
                    const draft = officerDrafts[role] || {
                      officer_name: '',
                      officer_designation: '',
                      officer_service_info: '',
                      status: 'Forwarded for Approval',
                    };
                    const isDeskOfficerEditable = isDeskOfficer && !autoPrint && currentOfficerRole === role;
                    const isProviderEditable = isServiceProvider && !autoPrint && currentOfficerRole === role;
                    const providerCandidates = getProviderCandidates(role);
                    const assignedOfficerName = slot.name || getOfficerNameByRole(role);
                    const roleAssignments = getRoleItemAssignments(officerActionDetails, role);
                    const visibleAssignments = viewerIsServiceProvider && currentUser?.email
                      ? roleAssignments.filter((assignment) => assignment.provider_email === currentUser.email)
                      : roleAssignments;
                    const selectedAssignedItems = draft.assigned_items || [];
                    const availableRoleItems = getRoleSelectedItems(app.service_type, role, systemSettings);
                    const alreadyAssignedItems = Array.from(new Set(roleAssignments.flatMap((assignment) => assignment.assigned_items)));
                    const remainingRoleItems = availableRoleItems.filter((item) => !alreadyAssignedItems.includes(item));
                    const selectedProviderEmail = draft.provider_email || '';
                    const isSelfAssignedDraft = !!currentUser?.email && selectedProviderEmail === currentUser.email;
                    const selfProviderCandidate =
                      isDeskOfficerEditable && currentUser?.email
                        ? [{
                            id: -1,
                            name: currentUser.name || '',
                            name_bn: currentUser.name_bn || currentUser.name || '',
                            email: currentUser.email,
                            role: getServiceProviderRoleForOfficerRole(role),
                            division: currentUser.division || '',
                            designation: currentUser.designation || '',
                            status: 'Active' as const,
                          }]
                        : [];
                    const providerOptions = Array.from(
                      new Map(
                        [...selfProviderCandidate, ...providerCandidates].map((provider) => [provider.email, provider]),
                      ).values(),
                    );
                    const resolvedProviderRole = draft.provider_role || getServiceProviderRoleForOfficerRole(role);
                    const displayAssignments = visibleAssignments.length > 0 ? [...visibleAssignments] : [];
                    if (isDeskOfficerEditable && (selectedAssignedItems.length > 0 || selectedProviderEmail)) {
                      displayAssignments.push({
                        assigned_items: selectedAssignedItems,
                        provider_email: draft.provider_email,
                        provider_name: draft.provider_name || draft.officer_name,
                        provider_designation: draft.provider_designation || draft.officer_designation || providerRoleLabelMap[resolvedProviderRole],
                        provider_role: resolvedProviderRole,
                        officer_name: draft.officer_name || draft.provider_name,
                        officer_designation: draft.officer_designation || draft.provider_designation || providerRoleLabelMap[resolvedProviderRole],
                        officer_service_info: '',
                        status: isSelfAssignedDraft ? 'In Progress' : 'Forwarded for Approval',
                      });
                    }

                    return (
                      <div key={role} className="border border-gray-200 p-3">
                        <div className="mb-3 text-[11px] font-bold text-gray-700">
                          দায়িত্বপ্রাপ্ত কর্মকর্তা: {assignedOfficerName || 'নির্ধারিত নয়'} ({getOfficerRoleLabel(slot.label)})
                        </div>
                        {isDeskOfficerEditable && (
                          <div className="no-print print:hidden mb-4 rounded-lg border-2 border-orange-400 p-3">
                            <label className="mb-2 block text-[12px] font-bold text-gray-700">আবেদনকারীর নির্বাচিত আইটেম থেকে সেবা নির্বাচন করুন</label>
                            <div className="mb-3 flex flex-wrap gap-2">
                              {remainingRoleItems.length > 0 ? remainingRoleItems.map((item) => (
                                <label key={`${role}-${item}`} className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-bold text-gray-700">
                                  <input
                                    type="checkbox"
                                    checked={selectedAssignedItems.includes(item)}
                                    onChange={(e) => handleAssignedItemsChange(role, item, e.target.checked)}
                                    className="h-3.5 w-3.5 accent-orange-500"
                                  />
                                  <span>{item}</span>
                                </label>
                              )) : (
                                <span className="text-[11px] font-bold text-orange-600">এই ক্যাটাগরির সব নির্বাচিত আইটেম ইতোমধ্যে সেবা প্রদানকারীদের কাছে পাঠানো হয়েছে।</span>
                              )}
                            </div>
                            <label className="mb-2 block text-[12px] font-bold text-gray-700">Select service provider</label>
                            <select
                              value={selectedProviderEmail}
                              onChange={(e) => handleProviderSelection(role, e.target.value)}
                              disabled={remainingRoleItems.length === 0}
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500"
                            >
                              <option value="">Select service provider</option>
                              {providerOptions.map((provider) => (
                                <option key={provider.email} value={provider.email}>
                                  {(provider.name_bn || provider.name) || provider.email}
                                  {provider.email === currentUser?.email ? ' (Self)' : ''}
                                  {provider.designation ? ` - ${provider.designation}` : ''}
                                </option>
                              ))}
                            </select>
                            <p className="mt-2 text-[11px] font-bold text-orange-600">
                              {providerRoleLabelMap[resolvedProviderRole] || resolvedProviderRole}
                            </p>
                          </div>
                        )}
                        <div className="space-y-3">
                          {(displayAssignments.length > 0 ? displayAssignments : [null]).map((assignment, index) => {
                            const assignmentItems = assignment?.assigned_items || [];
                            const resolvedName = assignment?.provider_name || assignment?.officer_name || `${roleDetails.provider_name || ''}`;
                            const resolvedDesignation =
                              assignment?.provider_designation ||
                              assignment?.officer_designation ||
                              `${roleDetails.provider_designation || roleDetails.officer_designation || ''}` ||
                              providerRoleLabelMap[assignment?.provider_role || resolvedProviderRole] ||
                              'সেবা প্রদানকারী';
                            const resolvedServiceInfo = isProviderEditable && assignment?.provider_email === currentUser?.email
                              ? draft.officer_service_info
                              : assignment?.officer_service_info || '';
                            const resolvedStatus = isProviderEditable && assignment?.provider_email === currentUser?.email
                              ? draft.status
                              : assignment?.status || roleDetails.status || app.status;
                            const providerSignature = assignment?.provider_signature || (assignment?.provider_email === currentUser?.email ? slot.providerSig : null);
                            const providerDate = assignment?.provider_signed_at || (assignment?.provider_email === currentUser?.email ? slot.providerDate : null);

                            return (
                              <div key={`${role}-assignment-${assignment?.provider_email || 'pending'}-${index}`} className="border border-gray-100 p-3">
                                <div className="mb-3 text-[11px] font-bold text-gray-700">
                                  নির্ধারিত আইটেমসমূহ: {assignmentItems.length > 0 ? assignmentItems.join(', ') : 'এখনও নির্ধারণ করা হয়নি'}
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-xs mb-4">
                                  <div className="flex gap-2 items-end">
                                    <b>সেবা প্রদানকারীর নাম:</b>
                                    <span className="border-b border-black flex-1">{resolvedName}</span>
                                  </div>
                                  <div className="flex gap-2 items-end">
                                    <b>পদবী:</b>
                                    <span className="border-b border-black flex-1">{resolvedDesignation}</span>
                                  </div>
                                </div>
                                <div className="text-xs">
                                  <b>সেবা প্রদান সংক্রান্ত তথ্য :</b>
                                  {isProviderEditable && assignment?.provider_email === currentUser?.email ? (
                                    <textarea
                                      value={draft.officer_service_info}
                                      onChange={(e) => handleOfficerDraftChange(role, 'officer_service_info', e.target.value)}
                                      className="border border-black min-h-[60px] mt-1 w-full resize-none bg-transparent p-2 outline-none"
                                    />
                                  ) : (
                                    <div className="border border-black min-h-[60px] mt-1 p-2 whitespace-pre-wrap">{resolvedServiceInfo}</div>
                                  )}
                                </div>
                                <div className="mt-3 text-[11px] font-bold text-gray-700">
                                  বর্তমান অবস্থা: {STATUS_CONFIG[resolvedStatus]?.label || resolvedStatus}
                                </div>
                                <div className="mt-3 flex justify-between gap-8">
                                  <div className="text-center w-[45%] text-[10px] font-bold min-h-[44px]">
                                    <div className="mb-0.5 min-h-[24px] flex flex-col items-center justify-end">
                                      {providerSignature ? (
                                        <img src={providerSignature} alt="Provider Signature" className="h-5 object-contain" />
                                      ) : null}
                                      {providerDate ? (
                                        <span className="text-[8px] font-normal text-gray-500 leading-none whitespace-nowrap">
                                          {providerDate}
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="border-t border-black pt-1">সেবা প্রদানকারীর স্বাক্ষর ও তারিখ</div>
                                  </div>
                                  <div className="text-center w-[45%] text-[10px] font-bold min-h-[44px]"><div className="min-h-[24px]"></div><div className="border-t border-black pt-1">সেবা গ্রহণকারীর/পক্ষের স্বাক্ষর ও তারিখ</div></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            {/* Green Box below the white printed application */}
            {allowOfficerActions && !autoPrint && currentOfficerRole && scopedRelevantOfficerRoles.includes(currentOfficerRole as typeof scopedRelevantOfficerRoles[number]) && (() => {
              const role = currentOfficerRole;
              const draft = officerDrafts[role] || {
                officer_name: '',
                officer_designation: '',
                officer_service_info: '',
                status: 'Forwarded for Approval',
              };
              const remainingRoleItems = getRemainingRoleItems(role);
              return (
                <div className="no-print print:hidden mt-5 rounded-lg border border-blue-100 bg-blue-50/60 p-4 shadow-sm mx-auto w-full max-w-[800px]">
                  <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between md:gap-5">
                    {isServiceProvider ? (
                      <div className="flex-1">
                        <label className="mb-1 block text-[12px] font-bold text-gray-700">বর্তমান অবস্থা পরিবর্তন করুন (Status)</label>
                        <select
                          value={draft.status}
                          onChange={(e) => handleOfficerDraftChange(role, 'status', e.target.value)}
                          disabled={!currentUser?.signature || !!submittingRoles[role]}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-bold w-full outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                        >
                          <option value="Forwarded for Approval">প্রয়োজনীয় ব্যবস্থা গ্রহণের জন্য প্রেরিত</option>
                          <option value="In Progress">প্রক্রিয়াধীন রয়েছে</option>
                          <option value="Presented in File">নথিতে উপস্থাপন করা হয়েছে</option>
                          <option value="Done">সম্পন্ন</option>
                        </select>
                      </div>
                    ) : (
                      <div className="flex-1">
                        <label className="mb-1 block text-[12px] font-bold text-gray-700">নির্বাচিত সেবা প্রদানকারী</label>
                        <div className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-700">
                          {draft.provider_name || 'কোন সেবা প্রদানকারী নির্বাচন করা হয়নি'}
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOfficerActionSubmit(role)}
                      disabled={(isServiceProvider && !currentUser?.signature) || (!isServiceProvider && remainingRoleItems.length === 0) || !!submittingRoles[role]}
                      className="rounded-lg bg-[#1a3a6b] px-6 py-2 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-300 mt-2 md:mt-0"
                    >
                      {submittingRoles[role] ? 'আপডেট হচ্ছে...' : isServiceProvider ? 'স্ট্যাটাস আপডেট করুন' : 'সেন্ড করুন'}
                    </button>
                  </div>
                  {!isServiceProvider && remainingRoleItems.length === 0 && (
                    <p className="mt-2 text-[12px] font-bold text-green-600">এই ক্যাটাগরির সব নির্বাচিত আইটেম ইতোমধ্যে সেবা প্রদানকারীদের কাছে পাঠানো হয়েছে।</p>
                  )}
                  {isServiceProvider && !currentUser?.signature && (
                    <p className="mt-2 text-[12px] font-bold text-red-500">স্বাক্ষর আপলোড ছাড়া অবস্থা পরিবর্তন করা যাবে না</p>
                  )}
                  {statusMessages[role] && (
                    <p className={`mt-2 text-[12px] font-bold ${statusMessages[role].includes('সফলভাবে') ? 'text-green-600' : 'text-red-500'}`}>{statusMessages[role]}</p>
                  )}
                </div>
              );
            })()}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApplicationList({ user, view }: { user: UserData, view: 'my_applications' | 'assigned_applications' }) {
  const systemSettings = useSystemSettings();
  const officerCategoryMap = getOfficerCategoryMap(systemSettings);
  const providerOfficerRoles = getProviderOfficerRolesFromPermissions(user.permissions || [], systemSettings);
  const isProviderFeatureUser = providerOfficerRoles.length > 0;
  const isDeskOfficerUser = !!user.role?.startsWith('desk_officer_');
  const isProviderOnlyView = isProviderFeatureUser && !isDeskOfficerUser;
  const activeManagedCategories = getActiveManagedCategories(systemSettings);
  const categoryLabelMap = activeManagedCategories.reduce<Record<string, string>>((acc, category) => {
    acc[category.key] = category.label || category.key;
    return acc;
  }, {});
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [alertMessage, setAlertMessage] = useState('');
  const [printApp, setPrintApp] = useState<Application | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [textSearch, setTextSearch] = useState('');

  const fetchApps = async () => {
    try {
      let url = '/api/applications';
      if (view === 'my_applications') {
        url += `?email=${user.email}`;
      }
      const response = await fetch(url);
      let data = await response.json();

      if (view === 'my_applications') {
        data = Array.isArray(data) ? data.filter((app: Application) => app.user_email === user.email) : [];
      }
      
// Filter for Desk Officers in assigned_applications view
      if (view === 'assigned_applications') {
        const keyword = user.role ? officerCategoryMap[user.role] || '' : '';
        const allowedStatuses = ['Forwarded for Approval', 'In Progress', 'Presented in File', 'Done'];

        if (keyword) {
          data = data.filter((app: any) => app.service_type.includes(keyword) && allowedStatuses.includes(app.status))
                     .map((app: any) => ({
                       ...app,
                       service_type: app.service_type.split(', ').filter((s: string) => s.includes(keyword)).join(', '),
                       problem_details: parseCategoryProblemDetails(app.category_problem_details)[keyword] || app.problem_details
                     }));
        } else if (isProviderFeatureUser) {
          data = data.filter((app: Application) => allowedStatuses.includes(app.status));
        } else if (user.role === 'admin') {
          data = data.filter((app: Application) => allowedStatuses.includes(app.status));
        }
      }
      
      setApplications(data);
      setSelectedApp((prev) => prev ? (data.find((app: Application) => app.id === prev.id) || prev) : null);
      setPrintApp((prev) => prev ? (data.find((app: Application) => app.id === prev.id) || prev) : null);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, [user.email, user.role, view]); // Added view to dependency array

  const filteredApplications = applications.filter((app) => {
    const submittedAt = parseSubmissionDate(app.submission_date);
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo) : null;

    if (fromDate && submittedAt && submittedAt < fromDate) return false;
    if (toDate && submittedAt) {
      const inclusiveToDate = new Date(toDate);
      inclusiveToDate.setHours(23, 59, 59, 999);
      if (submittedAt > inclusiveToDate) return false;
    }

    if (serviceFilter && !app.service_type.includes(serviceFilter)) return false;
    if (statusFilter) {
      const appStatusLabel = STATUS_CONFIG[app.status]?.label || app.status;
      const selectedStatusLabel = STATUS_CONFIG[statusFilter]?.label || statusFilter;
      if (appStatusLabel !== selectedStatusLabel) return false;
    }

    if (!matchesTextQuery(textSearch, app.tracking_no, app.user_name, app.division, app.service_type, app.status)) {
      return false;
    }

    return true;
  });

  const serviceFilterOptions = activeManagedCategories.map((category) => category.key);
  const statusFilterOptions =
    view === 'assigned_applications'
      ? (['Forwarded for Approval', 'In Progress', 'Presented in File', 'Done'] as const)
      : [...REPORT_STATUS_OPTIONS];
  const getScopedApplicationForViewer = (application: Application) => {
    if (!isProviderOnlyView) {
      return application;
    }

    const mappedRole = providerOfficerRoles.find((role) => {
      const assignments = getRoleItemAssignments(getOfficerActionDetailsFromValue(application.officer_action_details), role);
      return assignments.some((assignment) => assignment.provider_email === user.email);
    }) || providerOfficerRoles[0];
    if (!mappedRole) return application;
    const scopedCategory = officerCategoryMap[mappedRole];
    const officerDetails = getOfficerActionDetailsFromValue(application.officer_action_details);
    const assignedItems = getRoleItemAssignments(officerDetails, mappedRole)
      .filter((assignment) => assignment.provider_email === user.email)
      .flatMap((assignment) => assignment.assigned_items);
    if (!scopedCategory) {
      return application;
    }

    const scopedServiceType = getServiceEntries(application.service_type)
      .filter((entry) => {
        if (entry.category !== scopedCategory) return false;
        if (!entry.detail) return true;
        if (systemSettings.requestTypes.includes(entry.detail)) return true;
        if (assignedItems.length === 0) return true;
        return assignedItems.includes(entry.detail);
      })
      .map((entry) => entry.detail ? `${entry.category} - ${entry.detail}` : entry.category)
      .join(', ');

    return scopedServiceType
      ? { ...application, service_type: scopedServiceType }
      : application;
  };

  const printFilteredReport = () => {
    const reportWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!reportWindow) {
      alert('রিপোর্ট খোলা যায়নি। অনুগ্রহ করে পপ-আপ অনুমতি দিন।');
      return;
    }

    const activeServiceLabel = serviceFilter || 'সকল';
    const activeStatusLabel = statusFilter ? (STATUS_CONFIG[statusFilter]?.label || statusFilter) : 'সকল';
    const activeDateLabel = dateFrom || dateTo
      ? `${dateFrom || 'শুরু নেই'} - ${dateTo || 'শেষ নেই'}`
      : 'সকল সময়';

    const rows = filteredApplications.length > 0
      ? filteredApplications.map((app, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(app.tracking_no)}</td>
            <td>${escapeHtml(app.submission_date)}</td>
            <td>${escapeHtml(app.service_type)}</td>
            <td>${escapeHtml(STATUS_CONFIG[app.status]?.label || app.status)}</td>
          </tr>
        `).join('')
      : `
          <tr>
            <td colspan="5" class="empty-row">নির্বাচিত ফিল্টারে কোনো আবেদন পাওয়া যায়নি</td>
          </tr>
        `;

    reportWindow.document.write(`
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${view === 'assigned_applications' ? 'অ্যাসাইনকৃত আবেদন রিপোর্ট' : 'আবেদনের ইতিহাস রিপোর্ট'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;700;800&display=swap');
          * { box-sizing: border-box; }
          body { margin: 0; padding: 28px; font-family: 'Noto Sans Bengali', sans-serif; color: #1f2937; background: #f8fafc; }
          .report { max-width: 1100px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 24px; padding: 32px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 24px; }
          .title { margin: 0; font-size: 28px; font-weight: 800; }
          .subtitle { margin: 8px 0 0; font-size: 14px; color: #6b7280; }
          .meta { text-align: right; font-size: 13px; color: #4b5563; }
          .filters { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-bottom: 24px; }
          .filter-card { border: 1px solid #e5e7eb; border-radius: 18px; padding: 14px 16px; background: #f8fafc; }
          .filter-label { font-size: 11px; color: #6b7280; margin-bottom: 6px; }
          .filter-value { font-size: 16px; font-weight: 700; color: #111827; }
          .summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-bottom: 24px; }
          .card { border: 1px solid #e5e7eb; border-radius: 18px; padding: 16px 18px; background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); }
          .card-label { font-size: 12px; color: #6b7280; margin-bottom: 8px; }
          .card-value { font-size: 28px; font-weight: 800; color: #111827; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          thead th { text-align: left; padding: 12px; background: #eff6ff; border-bottom: 1px solid #dbeafe; }
          tbody td { padding: 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
          .empty-row { text-align: center; color: #6b7280; padding: 28px; }
          @media print {
            body { background: #fff; padding: 0; }
            .report { border: none; border-radius: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="report">
          <div class="header">
            <div>
              <h1 class="title">${view === 'assigned_applications' ? 'অ্যাসাইনকৃত আবেদন রিপোর্ট' : 'আবেদনের ইতিহাস রিপোর্ট'}</h1>
              <p class="subtitle">${escapeHtml(user.name_bn)} | ${escapeHtml(user.division || 'বিভাগ নেই')}</p>
            </div>
            <div class="meta">
              <div>রিপোর্ট প্রস্তুতের তারিখ</div>
              <strong>${escapeHtml(new Date().toLocaleString('bn-BD'))}</strong>
            </div>
          </div>

          <div class="filters">
            <div class="filter-card">
              <div class="filter-label">তারিখ সীমা</div>
              <div class="filter-value">${escapeHtml(activeDateLabel)}</div>
            </div>
            <div class="filter-card">
              <div class="filter-label">সেবার ধরণ</div>
              <div class="filter-value">${escapeHtml(activeServiceLabel)}</div>
            </div>
            <div class="filter-card">
              <div class="filter-label">অবস্থা</div>
              <div class="filter-value">${escapeHtml(activeStatusLabel)}</div>
            </div>
          </div>

          <div class="summary">
            <div class="card">
              <div class="card-label">মোট আবেদন</div>
              <div class="card-value">${filteredApplications.length}</div>
            </div>
            <div class="card">
              <div class="card-label">প্রক্রিয়াধীন</div>
              <div class="card-value">${filteredApplications.filter((app) => ['Forwarded for Approval', 'In Progress', 'Presented in File'].includes(app.status)).length}</div>
            </div>
            <div class="card">
              <div class="card-label">সম্পন্ন</div>
              <div class="card-value">${filteredApplications.filter((app) => ['Done'].includes(app.status)).length}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>ট্র্যাকিং নম্বর</th>
                <th>তারিখ</th>
                <th>সেবার ধরণ</th>
                <th>অবস্থা</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    if (!user.signature) {
      setAlertMessage('স্ট্যাটাস পরিবর্তন করার আগে প্রোফাইলে আপনার স্বাক্ষর আপলোড করুন।');
      return;
    }
    try {
      await fetch(`/api/applications/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status,
          officer_signature: user.signature,
          officer_signed_at: new Date().toLocaleString('bn-BD'),
          officer_name: user.name_bn,
          officer_role: user.role
        })
      });
      fetchApps();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  if (loading) return <div className="text-center py-10 text-gray-500 text-xs">লোড হচ্ছে...</div>;

  return (
      <div className="space-y-5">
      {(view === 'my_applications' || view === 'assigned_applications') && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 font-['Noto_Sans_Bengali']">
          <div className="grid gap-4 xl:grid-cols-[280px_1fr] xl:items-start">
            <div className="self-start pt-1">
              <h3 className="text-sm font-bold text-gray-900">রিপোর্ট ও ফিল্টার</h3>
              <p className="mt-1 text-xs text-gray-500">তারিখ সীমা, সেবার ধরণ এবং অবস্থা অনুযায়ী আবেদন খুঁজুন ও রিপোর্ট নিন</p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 xl:items-end">
              <div>
                <label className="mb-1 block text-[11px] font-bold text-gray-500">টেবিল সার্চ</label>
                <input
                  type="text"
                  value={textSearch}
                  onChange={(e) => setTextSearch(e.target.value)}
                  placeholder="ট্র্যাকিং নম্বর, আবেদনকারী, বিভাগ বা অবস্থা"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-gray-500">শুরুর তারিখ</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-gray-500">শেষের তারিখ</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-gray-500">সেবার ধরণ</label>
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400"
                >
                  <option value="">সকল</option>
                  {serviceFilterOptions.map((item) => (
                    <option key={item} value={item}>{categoryLabelMap[item] || item}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-gray-500">অবস্থা</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400"
                >
                  <option value="">সকল</option>
                  {statusFilterOptions.map((item) => (
                    <option key={item} value={item}>{STATUS_CONFIG[item]?.label || item}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-3 xl:justify-end">
                <button
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                    setServiceFilter('');
                    setStatusFilter('');
                    setTextSearch('');
                  }}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-100"
                >
                  রিসেট
                </button>
                <button
                  onClick={printFilteredReport}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1a3a6b] px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-800"
                >
                  <Printer className="h-4 w-4" />
                  রিপোর্ট / প্রিন্ট
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">ট্র্যাকিং নম্বর</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">আবেদনকারী</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">তারিখ</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">সেবার ধরণ</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">অবস্থা</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredApplications.map((app) => {
              const scopedApp = getScopedApplicationForViewer(app);
              return (
                <ApplicationRow
                  key={app.id}
                  application={scopedApp}
                  id={scopedApp.tracking_no}
                  applicantName={scopedApp.user_name}
                  showApplicant
                  date={scopedApp.submission_date}
                  type={scopedApp.service_type}
                  providerEmail={isProviderOnlyView ? user.email : undefined}
                  onView={() => setSelectedApp(app)}
                  onPrint={!user.role?.startsWith('desk_officer_') ? () => setPrintApp(app) : undefined}
                />
              );
            })}
            {filteredApplications.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-xs italic">কোন আবেদন খুঁজে পাওয়া যায়নি</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedApp && (
        <ApplicationViewModal app={selectedApp} onClose={() => setSelectedApp(null)} currentUser={user} onApplicationUpdated={fetchApps} allowOfficerActions={view === 'assigned_applications'} />
      )}
      {printApp && (
        <ApplicationViewModal app={printApp} onClose={() => setPrintApp(null)} currentUser={user} autoPrint allowOfficerActions={view === 'assigned_applications'} />
      )}
      <AlertModal isOpen={!!alertMessage} message={alertMessage} onClose={() => setAlertMessage('')} />
    </div>
  );
}

interface ApplicationRowProps {
  application: Application;
  id: string;
  applicantName?: string;
  showApplicant?: boolean;
  date: string;
  type: string;
  providerEmail?: string;
  onView: () => void;
  onPrint?: () => void;
}

const ApplicationRow: React.FC<ApplicationRowProps> = ({ application, id, applicantName, showApplicant, date, type, providerEmail, onView, onPrint }) => {
  return (
    <tr className="hover:bg-gray-50/50 transition-colors">
      <td className="px-4 py-4 text-xs font-bold text-blue-600">{id}</td>
      {showApplicant && (
        <td className="px-4 py-4 text-xs text-gray-700">{applicantName || '-'}</td>
      )}
      <td className="px-4 py-4 text-xs text-gray-500">{date}</td>
      <td className="px-4 py-4 text-xs text-gray-600 min-w-[200px] max-w-[400px]">
        <ServiceTypeSummary serviceType={type} />
      </td>
      <td className="px-4 py-4">
        <ApplicationStatusSummary app={application} providerEmail={providerEmail} />
      </td>
      <td className="px-4 py-4 text-right">
        <div className="flex items-center justify-end gap-3">
          {onPrint && (
            <button
              onClick={onPrint}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-bold flex items-center gap-1"
            >
              <Printer className="w-3 h-3" /> প্রিন্ট / PDF
            </button>
          )}
          <button 
            onClick={onView}
            className="text-[#1a3a6b] hover:text-blue-900 text-xs font-bold flex items-center gap-1"
          >
            <FileText className="w-3 h-3" /> দেখুন
          </button>
        </div>
      </td>
    </tr>
  );
}

function PasswordChangeRequired({ user, onUpdate, onLogout }: { user: UserData; onUpdate: (user: UserData) => void; onLogout: () => void }) {
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNextPassword, setShowNextPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const passwordIsValid = nextPassword.length >= 6 && /[A-Z]/.test(nextPassword) && /[a-z]/.test(nextPassword) && /\d/.test(nextPassword) && /[^A-Za-z0-9]/.test(nextPassword);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    if (!passwordIsValid) {
      setMessage('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে এবং uppercase, lowercase, number ও special character থাকতে হবে।');
      return;
    }
    if (nextPassword !== confirmPassword) {
      setMessage('দুইটি পাসওয়ার্ড একই নয়।');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: nextPassword }),
      });
      const data = await response.json();
      if (data.success) {
        onUpdate(data.user);
      } else {
        setMessage(data.message || 'পাসওয়ার্ড পরিবর্তন করা যায়নি।');
      }
    } catch {
      setMessage('সার্ভার ত্রুটি। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">First login security</p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">পাসওয়ার্ড পরিবর্তন করুন</h1>
          <p className="mt-2 text-sm text-gray-500">{user.name_bn || user.name}, প্রথম লগইনের পর নিজের পাসওয়ার্ড সেট করা বাধ্যতামূলক।</p>
        </div>
        {message && <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>}
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-500">নতুন পাসওয়ার্ড</label>
            <div className="relative">
              <input type={showNextPassword ? 'text' : 'password'} value={nextPassword} onChange={(e) => setNextPassword(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-20 text-sm outline-none focus:border-blue-400" autoFocus />
              <button type="button" onClick={() => setShowNextPassword((prev) => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-700 hover:text-blue-900">
                {showNextPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-500">পাসওয়ার্ড নিশ্চিত করুন</label>
            <div className="relative">
              <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-20 text-sm outline-none focus:border-blue-400" />
              <button type="button" onClick={() => setShowConfirmPassword((prev) => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-700 hover:text-blue-900">
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <p className={`text-xs font-medium ${passwordIsValid ? 'text-green-700' : 'text-gray-500'}`}>কমপক্ষে ৬ অক্ষর, একটি uppercase, একটি lowercase, একটি number এবং একটি special character ব্যবহার করুন।</p>
        </div>
        <div className="mt-6 flex justify-between gap-3">
          <button type="button" onClick={onLogout} className="rounded-xl border border-gray-200 px-5 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50">লগআউট</button>
          <button type="submit" disabled={loading} className="rounded-xl bg-[#1a3a6b] px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{loading ? 'সংরক্ষণ হচ্ছে...' : 'পাসওয়ার্ড সেট করুন'}</button>
        </div>
      </form>
    </div>
  );
}

type AuditLogEntry = {
  id: number;
  created_at: string;
  user_email?: string;
  user_name?: string;
  user_role?: string;
  action: string;
  method: string;
  path: string;
  status_code?: number;
  details?: string;
};

type SignatureApproval = {
  id: number;
  name: string;
  name_bn: string;
  email: string;
  role: string;
  designation?: string;
  signature?: string;
  pending_signature?: string;
  signature_pending_at?: string;
};

function AuditLogBook() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (dateFrom) query.set('from', dateFrom);
      if (dateTo) query.set('to', dateTo);
      const logsResponse = await fetch(`/api/audit-logs?${query.toString()}`);
      setLogs(await logsResponse.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const downloadTxt = () => {
    const content = logs.map((log) => [
      log.created_at,
      log.user_name || '',
      log.user_email || '',
      log.user_role || '',
      log.action,
      log.path,
      log.status_code || '',
      log.details || '',
    ].join(' | ')).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">রিয়েল টাইম লগ</h3>
            <p className="text-xs text-gray-500">সিস্টেমের API action log</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <input type="datetime-local" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2 text-xs" />
            <input type="datetime-local" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2 text-xs" />
            <button onClick={fetchData} className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700">ফিল্টার</button>
            <button onClick={downloadTxt} className="rounded-xl bg-[#1a3a6b] px-4 py-2 text-xs font-bold text-white">TXT ডাউনলোড</button>
          </div>
        </div>
        <div className="mt-4 max-h-[520px] overflow-auto rounded-2xl border border-gray-100">
          <table className="min-w-[760px] w-full divide-y divide-gray-100">
            <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm"><tr><th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400">সময়</th><th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400">ব্যবহারকারী</th><th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400">অ্যাকশন</th><th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400">স্ট্যাটাস</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-3 py-2 text-xs text-gray-600">{new Date(log.created_at).toLocaleString('bn-BD')}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{log.user_name || 'System'}<br /><span className="text-[10px] text-gray-400">{log.user_email || ''}</span></td>
                  <td className="px-3 py-2 text-xs text-gray-700">{log.action}<br /><span className="text-[10px] text-gray-400">{log.path}</span></td>
                  <td className="px-3 py-2 text-xs font-bold text-gray-700">{log.status_code}</td>
                </tr>
              ))}
              {!loading && logs.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-xs text-gray-400">কোনো লগ পাওয়া যায়নি</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SignatureApprovalPanel() {
  const [approvals, setApprovals] = useState<SignatureApproval[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/signature-approvals');
      setApprovals(await response.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const decideSignature = async (id: number, decision: 'approved' | 'rejected') => {
    await fetch(`/api/signature-approvals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    });
    fetchApprovals();
  };

  return (
    <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5">
      <h3 className="text-sm font-bold text-gray-900">স্বাক্ষর অনুমোদন</h3>
      <div className="mt-4 space-y-3">
        {approvals.map((item) => (
          <div key={item.id} className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-gray-800">{item.name_bn || item.name}</p>
                <p className="text-xs text-gray-500">{item.email} · {item.role}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => decideSignature(item.id, 'approved')} className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white">অনুমোদন</button>
                <button onClick={() => decideSignature(item.id, 'rejected')} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white">বাতিল</button>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="mb-2 text-[10px] font-bold text-gray-400">বর্তমান স্বাক্ষর</p>
                {item.signature ? <img src={item.signature} className="h-20 w-full object-contain" /> : <p className="text-xs text-gray-400">নেই</p>}
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                <p className="mb-2 text-[10px] font-bold text-blue-500">নতুন স্বাক্ষর</p>
                {item.pending_signature ? <img src={item.pending_signature} className="h-20 w-full object-contain" /> : <p className="text-xs text-gray-400">নেই</p>}
              </div>
            </div>
          </div>
        ))}
        {!loading && approvals.length === 0 && <p className="text-xs text-gray-500">কোনো অপেক্ষমান স্বাক্ষর নেই।</p>}
      </div>
    </div>
  );
}

function Profile({ user, onUpdate }: { user: UserData, onUpdate: (user: UserData) => void }) {
  const [photo, setPhoto] = useState<string | null>(user.photo || null);
  const [signature, setSignature] = useState<string | null>(user.pending_signature || user.signature || null);
  const [designation, setDesignation] = useState(user.designation || '');
  const [mobile, setMobile] = useState(user.mobile || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'signature') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'photo') setPhoto(reader.result as string);
        else setSignature(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, photo, signature, designation, mobile }),
      });
      const data = await response.json();
      if (data.success) {
        onUpdate(data.user);
        setSignature(data.user.pending_signature || data.user.signature || null);
        setMessage(data.signaturePending ? 'নতুন স্বাক্ষর অনুমোদনের জন্য অ্যাডমিনের কাছে পাঠানো হয়েছে' : 'প্রোফাইল সফলভাবে আপডেট করা হয়েছে');
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      setMessage('সার্ভার ত্রুটি। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (type: 'photo' | 'signature') => {
    if (type === 'photo') setPhoto(null);
    else setSignature(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {message && (
        <div className={`p-4 rounded-lg text-sm ${message.includes('সফলভাবে') || message.includes('অনুমোদনের') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Basic Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 text-center">
            <div className="relative inline-block mb-4">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-white border-4 border-white shadow-md flex items-center justify-center">
                {photo ? (
                  <img src={photo} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-16 h-16 text-gray-300" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-[#1a3a6b] text-white p-2 rounded-full shadow-lg cursor-pointer hover:bg-blue-800 transition">
                <Camera className="w-4 h-4" />
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'photo')} />
              </label>
            </div>
            <h3 className="font-bold text-gray-800">{user.name_bn}</h3>
            <p className="text-xs text-gray-500">{user.name}</p>
            <div className="mt-4 pt-4 border-t border-gray-200 text-left space-y-2">
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-400 uppercase font-bold">ইমেইল</span>
                <span className="text-gray-600">{user.email}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-400 uppercase font-bold">বিভাগ</span>
                <span className="text-gray-600">{user.division || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-400 uppercase font-bold">রোল</span>
                <span className="text-gray-600 capitalize">{user.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Photo & Signature Management */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-gray-700 border-b pb-2">ব্যক্তিগত তথ্য</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">পদবী</label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none focus:border-blue-400"
                  placeholder="ঐচ্ছিক"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">মোবাইল</label>
                <input
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none focus:border-blue-400"
                  placeholder="ঐচ্ছিক"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-gray-700 border-b pb-2">ছবি ও স্বাক্ষর ব্যবস্থাপনা</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Photo Upload */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">প্রোফাইল ছবি</label>
                <div className="aspect-square bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-4 relative overflow-hidden group">
                  {photo ? (
                    <>
                      <img src={photo} alt="Preview" className="w-full h-full object-contain" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <button onClick={() => handleRemove('photo')} className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-[10px] text-gray-400">ছবি আপলোড করুন</p>
                    </div>
                  )}
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => handleFileChange(e, 'photo')} />
                </div>
              </div>

              {/* Signature Upload */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">স্ক্যান করা স্বাক্ষর</label>
                {user.pending_signature && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700">
                    নতুন স্বাক্ষর অনুমোদনের অপেক্ষায় আছে। অনুমোদন না হওয়া পর্যন্ত পুরোনো স্বাক্ষর ব্যবহৃত হবে।
                  </div>
                )}
                <div className="aspect-square bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-4 relative overflow-hidden group">
                  {signature ? (
                    <>
                      <img src={signature} alt="Signature" className="w-full h-full object-contain" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <button onClick={() => handleRemove('signature')} className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <PenTool className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-[10px] text-gray-400">স্বাক্ষর আপলোড করুন</p>
                    </div>
                  )}
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => handleFileChange(e, 'signature')} />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                onClick={handleSave}
                disabled={loading}
                className="bg-[#1a3a6b] text-white px-6 py-2 rounded-lg text-xs font-bold hover:bg-blue-800 transition disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? 'সংরক্ষণ করা হচ্ছে...' : 'পরিবর্তন সংরক্ষণ করুন'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface UserAccount {
  id: number;
  name: string;
  email: string;
  role: string;
  division?: string;
  status: 'Active' | 'Inactive';
  extra_permissions?: string[];
  denied_permissions?: string[];
}

function UserManagement() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserEmailForReport, setSelectedUserEmailForReport] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'role' | 'division' | 'status'>('name');

  const getRolePermissions = (roleSlug: string) => {
    const matchedRole = roles.find((role) => role.slug === roleSlug);
    if (!matchedRole?.permissions) return [];

    try {
      return JSON.parse(matchedRole.permissions) as string[];
    } catch (error) {
      console.error('Error parsing role permissions:', error);
      return [];
    }
  };

  const getEffectivePermissions = (user: UserAccount) => {
    const rolePermissions = getRolePermissions(user.role);
    const extraPermissions = user.extra_permissions || [];
    const deniedPermissions = user.denied_permissions || [];
    const mergedPermissions = Array.from(new Set([...rolePermissions, ...extraPermissions]));

    if (SERVICE_PROVIDER_FEATURES.some((feature) => mergedPermissions.includes(feature))) {
      mergedPermissions.push('assigned_applications');
    }

    return Array.from(
      new Set(mergedPermissions.filter((permission) => !deniedPermissions.includes(permission)))
    );
  };

  const getFeatureName = (featureId: string) =>
    AVAILABLE_FEATURES.find((feature) => feature.id === featureId)?.name || featureId;

  useEffect(() => {
    fetchUsers();
    fetchDivisions();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDivisions = async () => {
    try {
      const response = await fetch('/api/divisions');
      const data = await response.json();
      setDivisions(data);
    } catch (error) {
      console.error('Error fetching divisions:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles');
      const data = await response.json();
      setRoles(data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    division: '',
    status: 'Active' as 'Active' | 'Inactive',
    extra_permissions: [] as string[],
    denied_permissions: [] as string[],
  });

  const roleAssignedPermissions = getRolePermissions(formData.role);
  const extraFeatureOptions = AVAILABLE_FEATURES.filter(
    (feature) => !roleAssignedPermissions.includes(feature.id)
  );
  const primaryRoleOptions = roles.filter((role) => !isServiceProviderFeature(role.slug));

  const handleOpenModal = (user?: UserAccount) => {
    if (user) {
      const legacyProviderFeature = isServiceProviderFeature(user.role) ? user.role : '';
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: legacyProviderFeature ? 'employee' : user.role,
        division: user.division || '',
        status: user.status,
        extra_permissions: Array.from(new Set([
          ...(user.extra_permissions || []),
          ...(legacyProviderFeature ? [legacyProviderFeature] : []),
        ])),
        denied_permissions: user.denied_permissions || [],
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'employee',
        division: '',
        status: 'Active',
        extra_permissions: [],
        denied_permissions: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      division: formData.division,
      status: formData.status,
      extra_permissions: formData.extra_permissions,
      denied_permissions: formData.denied_permissions,
    };

    try {
      if (editingUser) {
        await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      fetchUsers();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const filteredUsers = [...users]
    .filter((user) => {
      const query = searchTerm.trim().toLowerCase();
      if (!query) return true;
      return [
        user.name,
        user.email,
        user.role,
        user.division || '',
        user.status,
        ...getEffectivePermissions(user)
      ].some((value) => value.toLowerCase().includes(query));
    })
    .sort((a, b) => {
      const aValue = (a[sortBy] || '').toString().toLowerCase();
      const bValue = (b[sortBy] || '').toString().toLowerCase();
      return aValue.localeCompare(bValue, 'bn');
    });

  const handleDelete = async () => {
    if (confirmDeleteId) {
      try {
        await fetch(`/api/users/${confirmDeleteId}`, { method: 'DELETE' });
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      } finally {
        setConfirmDeleteId(null);
      }
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const requiredHeaders = ['name', 'email', 'password', 'role', 'division', 'status'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
          alert(`CSV ফাইলে নিম্নলিখিত কলামগুলো অনুপস্থিত: ${missingHeaders.join(', ')}`);
          return;
        }

        const newUsers = [];
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const values = lines[i].split(',').map(v => v.trim());
          const user: any = {};
          headers.forEach((header, index) => {
            user[header] = values[index];
          });
          newUsers.push(user);
        }

        // Send to backend
        for (const user of newUsers) {
          await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
          });
        }
        
        fetchUsers();
        alert('সফলভাবে ইউজার ইমপোর্ট করা হয়েছে!');
      } catch (error) {
        console.error('Error importing CSV:', error);
        alert('CSV ইমপোর্ট করার সময় একটি ত্রুটি হয়েছে।');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  if (loading) return <div className="text-center py-10 text-gray-500 text-xs">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-6">
      <SignatureApprovalPanel />

      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-gray-700">ইউজার তালিকা</h3>
        <div className="flex gap-2">
          <a 
            href="data:text/csv;charset=utf-8,name,email,password,role,division,status%0AJohn Doe,john@example.com,password123,employee,Administration,Active" 
            download="users_template.csv"
            className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-gray-200 transition flex items-center gap-2 border border-gray-200"
          >
            <Download className="w-3.5 h-3.5" />
            টেমপ্লেট ডাউনলোড
          </a>
          <label className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-green-700 transition flex items-center gap-2 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            CSV ইমপোর্ট
            <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
          </label>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-[#1a3a6b] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-blue-800 transition flex items-center gap-2"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            নতুন ইউজার যোগ করুন
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 font-['Noto_Sans_Bengali']">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
          <div>
            <label className="mb-1 block text-[11px] font-bold text-gray-500">সার্চ</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="নাম, ইমেইল, রোল, বিভাগ বা অবস্থা দিয়ে খুঁজুন"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold text-gray-500">সাজান</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'email' | 'role' | 'division' | 'status')}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-blue-400"
            >
              <option value="name">নাম</option>
              <option value="email">ইমেইল</option>
              <option value="role">রোল</option>
              <option value="division">বিভাগ</option>
              <option value="status">অবস্থা</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="w-full overflow-x-hidden">
        <table className="w-full table-fixed divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">নাম</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">ইমেইল</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">রোল</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">বিভাগ</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">ফিচার</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">অবস্থা</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredUsers.map((u) => {
              const effectivePermissions = getEffectivePermissions(u);
              const extraPermissions = u.extra_permissions || [];
              const deniedPermissions = u.denied_permissions || [];

              return (
              <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-4 text-xs font-bold text-gray-800">{u.name}</td>
                <td className="px-4 py-4 text-xs text-gray-500 break-words">{u.email}</td>
                <td className="px-4 py-4 text-xs text-gray-600 break-words">{u.role}</td>
                <td className="px-4 py-4 text-xs text-gray-600 break-words">{u.division}</td>
                <td className="px-4 py-4 align-top">
                  <div className="max-w-full space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {effectivePermissions.length > 0 ? effectivePermissions.slice(0, 6).map((permission) => (
                        <span key={`${u.id}-${permission}`} className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-700">
                          {getFeatureName(permission)}
                        </span>
                      )) : (
                        <span className="text-[10px] italic text-gray-400">কোন ফিচার নেই</span>
                      )}
                      {effectivePermissions.length > 6 && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-bold text-gray-500">
                          +{effectivePermissions.length - 6} আরও
                        </span>
                      )}
                    </div>
                    {(extraPermissions.length > 0 || deniedPermissions.length > 0) && (
                      <div className="space-y-1">
                        {extraPermissions.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {extraPermissions.map((permission) => (
                              <span key={`${u.id}-extra-${permission}`} className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700">
                                + {getFeatureName(permission)}
                              </span>
                            ))}
                          </div>
                        )}
                        {deniedPermissions.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {deniedPermissions.map((permission) => (
                              <span key={`${u.id}-deny-${permission}`} className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-700">
                                - {getFeatureName(permission)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-0.5 text-[9px] font-bold text-white rounded-full ${u.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {u.status === 'Active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </span>
                </td>
                <td className="px-4 py-4 align-middle">
                  <div className="flex items-center justify-center gap-1">
                  <button 
                    onClick={() => setSelectedUserEmailForReport(u.email)}
                    className="text-green-600 hover:text-green-800 p-1 transition-colors"
                    title="রিপোর্ট"
                    aria-label="রিপোর্ট"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleOpenModal(u)}
                    className="text-blue-600 hover:text-blue-800 p-1 transition-colors"
                    title="এডিট"
                    aria-label="এডিট"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setConfirmDeleteId(u.id)}
                    className="text-red-600 hover:text-red-800 p-1 transition-colors"
                    title="ডিলিট"
                    aria-label="ডিলিট"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  </div>
                </td>
              </tr>
            )})}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-xs italic">কোন ইউজার খুঁজে পাওয়া যায়নি</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedUserEmailForReport && (
        <UserReport 
          email={selectedUserEmailForReport} 
          onClose={() => setSelectedUserEmailForReport(null)} 
        />
      )}

      <ConfirmModal 
        isOpen={!!confirmDeleteId} 
        message="আপনি কি নিশ্চিত যে আপনি এই ইউজারটি মুছতে চান?" 
        onConfirm={handleDelete} 
        onCancel={() => setConfirmDeleteId(null)} 
      />

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="bg-[#1a3a6b] px-6 py-4 flex justify-between items-center">
              <h3 className="text-white font-bold text-sm">
                {editingUser ? 'ইউজার এডিট করুন' : 'নতুন ইউজার যোগ করুন'}
              </h3>
              <button onClick={handleCloseModal} className="text-white hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">নাম</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="উদা: মারুফ আলম"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">ইমেইল</label>
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="উদা: user@ugc.gov.bd"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">পাসওয়ার্ড</label>
                  <input 
                    type="text" 
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder={editingUser ? 'পাসওয়ার্ড রিসেট করতে চাইলে লিখুন' : 'পাসওয়ার্ড লিখুন'}
                  />
                  {editingUser && (
                    <p className="mt-1 text-[10px] text-gray-500">ফাঁকা রাখলে বর্তমান পাসওয়ার্ড অপরিবর্তিত থাকবে।</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">রোল</label>
                  <select 
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
                    <option value="">রোল নির্বাচন করুন</option>
                    {primaryRoleOptions.map(r => (
                      <option key={r.id} value={r.slug}>{r.name} ({r.name_bn})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">বিভাগ</label>
                  <select 
                    value={formData.division}
                    onChange={(e) => setFormData({...formData, division: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
                    <option value="">বিভাগ নির্বাচন করুন</option>
                    {divisions.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">অবস্থা</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as 'Active' | 'Inactive'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Active">সক্রিয় (Active)</option>
                    <option value="Inactive">নিষ্ক্রিয় (Inactive)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-bold text-gray-700 mb-3">অতিরিক্ত ফিচার</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {extraFeatureOptions.length > 0 ? extraFeatureOptions.map((feature) => (
                      <label key={`extra-${feature.id}`} className="flex items-center gap-2 text-xs text-gray-700">
                        <input
                          type="checkbox"
                          checked={formData.extra_permissions.includes(feature.id)}
                          onChange={(e) => {
                            const nextPermissions = e.target.checked
                              ? [...formData.extra_permissions, feature.id]
                              : formData.extra_permissions.filter((permission) => permission !== feature.id);
                            setFormData({
                              ...formData,
                              extra_permissions: nextPermissions,
                              denied_permissions: formData.denied_permissions.filter((permission) => permission !== feature.id),
                            });
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span>{feature.name}</span>
                      </label>
                    )) : (
                      <p className="text-[10px] italic text-gray-400">এই রোলে বাকি কোনো অতিরিক্ত ফিচার নেই</p>
                    )}
                  </div>
                  <p className="mt-3 text-[10px] text-gray-500">রোলের বাইরে এই ইউজারকে অতিরিক্ত যে ফিচারগুলো দিতে চান সেগুলো নির্বাচন করুন।</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-bold text-gray-700 mb-3">নিষ্ক্রিয় ফিচার</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {AVAILABLE_FEATURES.map((feature) => (
                      <label key={`deny-${feature.id}`} className="flex items-center gap-2 text-xs text-gray-700">
                        <input
                          type="checkbox"
                          checked={formData.denied_permissions.includes(feature.id)}
                          onChange={(e) => {
                            const nextPermissions = e.target.checked
                              ? [...formData.denied_permissions, feature.id]
                              : formData.denied_permissions.filter((permission) => permission !== feature.id);
                            setFormData({
                              ...formData,
                              denied_permissions: nextPermissions,
                              extra_permissions: formData.extra_permissions.filter((permission) => permission !== feature.id),
                            });
                          }}
                          className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                        />
                        <span>{feature.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-3 text-[10px] text-gray-500">রোলের মাধ্যমে পাওয়া ফিচারও এখানে ব্লক করা যাবে।</p>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 transition"
                >
                  বাতিল
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#1a3a6b] text-white rounded-lg text-sm font-bold hover:bg-blue-800 transition"
                >
                  {editingUser ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportsPage({ user }: { user: UserData }) {
  const systemSettings = useSystemSettings();
  const activeCategories = systemSettings.categories.filter((category) => category.active && category.key.trim());
  const categoryLabelMap = activeCategories.reduce<Record<string, string>>((acc, category) => {
    acc[category.key] = category.label || category.key;
    return acc;
  }, {});
  const [applications, setApplications] = useState<Application[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [divisions, setDivisions] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [itemFilter, setItemFilter] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [applicationsRes, usersRes, divisionsRes] = await Promise.all([
          fetch('/api/applications'),
          fetch('/api/users'),
          fetch('/api/divisions'),
        ]);

        const [applicationsData, usersData, divisionsData] = await Promise.all([
          applicationsRes.json(),
          usersRes.json(),
          divisionsRes.json(),
        ]);

        setApplications(Array.isArray(applicationsData) ? applicationsData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
        setDivisions(Array.isArray(divisionsData) ? divisionsData : []);
      } catch (error) {
        console.error('Error fetching reports data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getApplicationItemEntries = (serviceType: string) => (
    serviceType
      .split(', ')
      .filter(Boolean)
      .map((entry) => {
        const [rawCategory, rawDetail] = entry.split(' - ');
        const category = rawCategory?.trim();
        const detail = rawDetail?.trim();

        if (systemSettings.requestTypes.includes(detail)) {
          return null;
        }

        return {
          category,
          detail,
          itemName: `${categoryLabelMap[category] || category} :: ${detail}`,
          originalEntry: entry,
        };
      })
      .filter((item): item is { category: string; detail: string; itemName: string; originalEntry: string } => Boolean(item))
  );

  const filteredApplications = applications.filter((app) => {
    const submittedAt = parseSubmissionDate(app.submission_date);
    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

    if (fromDate && submittedAt && submittedAt < fromDate) return false;
    if (toDate && submittedAt && submittedAt > toDate) return false;
    if (statusFilter && app.status !== statusFilter) return false;
    if (serviceFilter && !app.service_type.includes(serviceFilter)) return false;
    if (divisionFilter && app.division !== divisionFilter) return false;
    if (itemFilter && !getApplicationItemEntries(app.service_type).some((item) => item.itemName === itemFilter)) return false;

    return true;
  });

  const displayApplications = filteredApplications.map((app) => {
    if (!itemFilter) return app;

    const matchingEntries = getApplicationItemEntries(app.service_type)
      .filter((item) => item.itemName === itemFilter)
      .map((item) => item.originalEntry);

    return {
      ...app,
      service_type: matchingEntries.join(', ') || app.service_type,
    };
  });

  const totalApplications = filteredApplications.length;
  const completedApplications = filteredApplications.filter((app) => app.status === 'Done').length;
  const activeApplications = filteredApplications.filter((app) => ['Forwarded for Approval', 'In Progress', 'Presented in File'].includes(app.status)).length;
  const rejectedApplications = filteredApplications.filter((app) => app.status === 'Rejected by Divisional Head').length;

  const divisionSummary = divisions
    .map((division) => {
      const divisionApplications = filteredApplications.filter((app) => app.division === division.name);
      return {
        name: division.name,
        total: divisionApplications.length,
        completed: divisionApplications.filter((app) => app.status === 'Done').length,
        active: divisionApplications.filter((app) => ['Forwarded for Approval', 'In Progress', 'Presented in File'].includes(app.status)).length,
        rejected: divisionApplications.filter((app) => app.status === 'Rejected by Divisional Head').length,
      };
    })
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);

  const userSummary = users
    .map((userAccount) => {
      const userApplications = filteredApplications.filter((app) => app.user_email === userAccount.email);
      return {
        email: userAccount.email,
        name: userAccount.name,
        division: userAccount.division || 'প্রযোজ্য নয়',
        total: userApplications.length,
        completed: userApplications.filter((app) => app.status === 'Done').length,
        active: userApplications.filter((app) => ['Forwarded for Approval', 'In Progress', 'Presented in File'].includes(app.status)).length,
        rejected: userApplications.filter((app) => app.status === 'Rejected by Divisional Head').length,
      };
    })
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);

  const serviceSummary = activeCategories.map((category) => {
    const matchingApplications = filteredApplications.filter((app) => app.service_type.includes(category.key));
    return {
      name: category.label,
      key: category.key,
      total: matchingApplications.length,
      completed: matchingApplications.filter((app) => app.status === 'Done').length,
      active: matchingApplications.filter((app) => ['Forwarded for Approval', 'In Progress', 'Presented in File'].includes(app.status)).length,
      rejected: matchingApplications.filter((app) => app.status === 'Rejected by Divisional Head').length,
    };
  }).filter((item) => item.total > 0);

  const serviceTypeSummary = activeCategories.flatMap((category) => {
    return systemSettings.requestTypes.map((requestType) => {
      const matchingApplications = filteredApplications.filter((app) =>
        app.service_type.includes(`${category.key} - ${requestType}`)
      );

      return {
        category: category.key,
        categoryLabel: category.label,
        requestType,
        total: matchingApplications.length,
      };
    });
  }).filter((item) => item.total > 0);

  const itemSummary = Array.from(
    filteredApplications.reduce((acc, app) => {
      getApplicationItemEntries(app.service_type).forEach((item) => {
        if (itemFilter && item.itemName !== itemFilter) {
          return;
        }

        const itemKey = item.itemName;
        const current = acc.get(itemKey) || 0;
        acc.set(itemKey, current + 1);
      });
      return acc;
    }, new Map<string, number>())
  )
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  const itemOptions = activeCategories.flatMap((category) =>
    category.items.map((item) => `${category.label} :: ${item}`)
  );

  itemOptions.sort((a, b) => a.localeCompare(b, 'bn'));

  const activeFilterSummary = [
    dateFrom ? `শুরুর তারিখ: ${dateFrom}` : null,
    dateTo ? `শেষের তারিখ: ${dateTo}` : null,
    statusFilter ? `অবস্থা: ${STATUS_CONFIG[statusFilter]?.label || statusFilter}` : null,
    serviceFilter ? `সেবার ধরণ: ${categoryLabelMap[serviceFilter] || serviceFilter}` : null,
    divisionFilter ? `বিভাগ: ${divisionFilter}` : null,
    itemFilter ? `আইটেম: ${itemFilter}` : null,
  ].filter((item): item is string => Boolean(item));

  const printReport = () => {
    const reportWindow = window.open('', '_blank', 'width=1280,height=900');
    if (!reportWindow) {
      alert('রিপোর্ট খোলা যায়নি। অনুগ্রহ করে পপ-আপ অনুমতি দিন।');
      return;
    }

    const tableRows = displayApplications.length > 0
      ? displayApplications.map((app, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(app.tracking_no)}</td>
            <td>${escapeHtml(app.user_name)}</td>
            <td>${escapeHtml(app.division)}</td>
            <td>${escapeHtml(app.service_type)}</td>
            <td>${escapeHtml(STATUS_CONFIG[app.status]?.label || app.status)}</td>
            <td>${escapeHtml(app.submission_date)}</td>
          </tr>
        `).join('')
      : `<tr><td colspan="7" class="empty-row">নির্বাচিত ফিল্টারে কোনো আবেদন পাওয়া যায়নি</td></tr>`;

    const divisionRows = divisionSummary.length > 0
      ? divisionSummary.map((item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(item.name)}</td>
            <td>${item.total}</td>
            <td>${item.active}</td>
            <td>${item.completed}</td>
            <td>${item.rejected}</td>
          </tr>
        `).join('')
      : `<tr><td colspan="6" class="empty-row">কোন বিভাগভিত্তিক তথ্য পাওয়া যায়নি</td></tr>`;

    const serviceTypeRows = serviceTypeSummary.length > 0
      ? serviceTypeSummary.map((item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(item.categoryLabel)}</td>
            <td>${escapeHtml(item.requestType)}</td>
            <td>${item.total}</td>
          </tr>
        `).join('')
      : `<tr><td colspan="4" class="empty-row">কোন টাইপভিত্তিক তথ্য পাওয়া যায়নি</td></tr>`;

    const itemRows = itemSummary.length > 0
      ? itemSummary.map((item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(item.name)}</td>
            <td>${item.total}</td>
          </tr>
        `).join('')
      : `<tr><td colspan="3" class="empty-row">কোন আইটেমভিত্তিক তথ্য পাওয়া যায়নি</td></tr>`;

    const filterRows = activeFilterSummary.length > 0
      ? activeFilterSummary.map((item) => `<span class="filter-chip">${escapeHtml(item)}</span>`).join('')
      : '<span class="filter-chip">কোন অতিরিক্ত ফিল্টার প্রযোজ্য নয়</span>';

    reportWindow.document.write(`
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8" />
        <title>সমন্বিত রিপোর্ট</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;700;800&display=swap');
          body { margin: 0; padding: 28px; font-family: 'Noto Sans Bengali', sans-serif; color: #1f2937; background: #f8fafc; }
          .report { max-width: 1180px; margin: 0 auto; background: white; border: 1px solid #e5e7eb; border-radius: 24px; padding: 32px; }
          .header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 20px; }
          .title { font-size: 28px; font-weight: 800; margin: 0 0 6px; }
          .subtitle { margin: 0; color: #6b7280; font-size: 13px; }
          .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 20px 0 28px; }
          .card { border: 1px solid #e5e7eb; border-radius: 18px; padding: 14px 16px; background: #f8fafc; }
          .card-label { font-size: 11px; color: #6b7280; margin-bottom: 6px; }
          .card-value { font-size: 24px; font-weight: 800; }
          .filters { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 18px; }
          .filter-chip { display: inline-flex; align-items: center; padding: 6px 10px; border-radius: 999px; background: #eff6ff; color: #1d4ed8; font-size: 11px; font-weight: 700; }
          h2 { margin: 28px 0 12px; font-size: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; vertical-align: top; }
          th { background: #eff6ff; }
          .empty-row { text-align: center; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="report">
          <div class="header">
            <div>
              <h1 class="title">সমন্বিত রিপোর্ট</h1>
              <p class="subtitle">প্রস্তুত করেছেন: ${escapeHtml(user.name_bn || user.name)}</p>
            </div>
            <div>
              <div>রিপোর্ট প্রস্তুতের তারিখ</div>
              <strong>${escapeHtml(new Date().toLocaleString('bn-BD'))}</strong>
            </div>
          </div>
          <div class="summary">
            <div class="card"><div class="card-label">মোট আবেদন</div><div class="card-value">${totalApplications}</div></div>
            <div class="card"><div class="card-label">প্রক্রিয়াধীন</div><div class="card-value">${activeApplications}</div></div>
            <div class="card"><div class="card-label">সম্পন্ন</div><div class="card-value">${completedApplications}</div></div>
            <div class="card"><div class="card-label">বাতিল</div><div class="card-value">${rejectedApplications}</div></div>
          </div>
          <div class="filters">${filterRows}</div>
          <h2>বিভাগভিত্তিক রিপোর্ট</h2>
          <table>
            <thead><tr><th>#</th><th>বিভাগ</th><th>মোট</th><th>প্রক্রিয়াধীন</th><th>সম্পন্ন</th><th>বাতিল</th></tr></thead>
            <tbody>${divisionRows}</tbody>
          </table>
          ${itemFilter ? '' : `
          <h2>সেবা টাইপভিত্তিক রিপোর্ট</h2>
          <table>
            <thead><tr><th>#</th><th>সেবা ক্যাটাগরি</th><th>টাইপ</th><th>মোট আবেদন</th></tr></thead>
            <tbody>${serviceTypeRows}</tbody>
          </table>
          `}
          <h2>আইটেমভিত্তিক রিপোর্ট</h2>
          <table>
            <thead><tr><th>#</th><th>আইটেম</th><th>মোট আবেদন</th></tr></thead>
            <tbody>${itemRows}</tbody>
          </table>
          <h2>প্রতিষ্ঠানব্যাপী আবেদন তালিকা</h2>
          <table>
            <thead><tr><th>#</th><th>ট্র্যাকিং নং</th><th>আবেদনকারী</th><th>বিভাগ</th><th>সেবার ধরণ</th><th>অবস্থা</th><th>তারিখ</th></tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </body>
      </html>
    `);

    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  if (loading) return <div className="text-center py-10 text-gray-500 text-xs">রিপোর্ট লোড হচ্ছে...</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
        <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <div>
            <label className="mb-1 block text-[11px] font-bold text-gray-500">শুরুর তারিখ</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold text-gray-500">শেষের তারিখ</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold text-gray-500">অবস্থা</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400">
              <option value="">সকল</option>
              {REPORT_STATUS_OPTIONS.map((item) => <option key={item} value={item}>{STATUS_CONFIG[item]?.label || item}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold text-gray-500">সেবার ধরণ</label>
            <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400">
              <option value="">সকল</option>
              {activeCategories.map((item) => <option key={item.id} value={item.key}>{item.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold text-gray-500">বিভাগ</label>
            <select value={divisionFilter} onChange={(e) => setDivisionFilter(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400">
              <option value="">সকল</option>
              {divisions.map((division) => <option key={division.id} value={division.name}>{division.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold text-gray-500">আইটেমভিত্তিক</label>
            <select value={itemFilter} onChange={(e) => setItemFilter(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400">
              <option value="">সকল</option>
              {itemOptions.map((itemName) => <option key={itemName} value={itemName}>{itemName}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            onClick={() => {
              setDateFrom('');
              setDateTo('');
              setStatusFilter('');
              setServiceFilter('');
              setDivisionFilter('');
              setItemFilter('');
            }}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-100"
          >
            রিসেট
          </button>
          <button onClick={printReport} className="inline-flex items-center gap-2 rounded-xl bg-[#1a3a6b] px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-800">
            <Printer className="h-4 w-4" />
            রিপোর্ট / প্রিন্ট
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
        <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-blue-500">সক্রিয় ফিল্টার</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {activeFilterSummary.length > 0 ? activeFilterSummary.map((item) => (
            <span key={item} className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
              {item}
            </span>
          )) : (
            <span className="text-xs text-blue-700">কোন অতিরিক্ত ফিল্টার প্রযোজ্য নয়</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <UserReportStatCard label="মোট আবেদন" value={totalApplications} color="blue" />
        <UserReportStatCard label="প্রক্রিয়াধীন" value={activeApplications} color="yellow" />
        <UserReportStatCard label="সম্পন্ন" value={completedApplications} color="green" />
        <UserReportStatCard label="বাতিল" value={rejectedApplications} color="red" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-bold text-gray-800">প্রতিষ্ঠানব্যাপী সারাংশ</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">সূচক</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">মান</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <tr><td className="px-3 py-2 text-xs text-gray-600">মোট আবেদন</td><td className="px-3 py-2 text-xs font-bold text-gray-800">{totalApplications}</td></tr>
                <tr><td className="px-3 py-2 text-xs text-gray-600">মোট ইউজার</td><td className="px-3 py-2 text-xs font-bold text-gray-800">{users.length}</td></tr>
                <tr><td className="px-3 py-2 text-xs text-gray-600">মোট বিভাগ</td><td className="px-3 py-2 text-xs font-bold text-gray-800">{divisions.length}</td></tr>
                <tr><td className="px-3 py-2 text-xs text-gray-600">প্রক্রিয়াধীন</td><td className="px-3 py-2 text-xs font-bold text-gray-800">{activeApplications}</td></tr>
                <tr><td className="px-3 py-2 text-xs text-gray-600">সম্পন্ন</td><td className="px-3 py-2 text-xs font-bold text-gray-800">{completedApplications}</td></tr>
                <tr><td className="px-3 py-2 text-xs text-gray-600">বাতিল</td><td className="px-3 py-2 text-xs font-bold text-gray-800">{rejectedApplications}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-bold text-gray-800">সেবার ধরণভিত্তিক রিপোর্ট</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">ধরণ</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">মোট</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">প্রক্রিয়াধীন</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">সম্পন্ন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {serviceSummary.map((item) => (
                  <tr key={item.key}>
                    <td className="px-3 py-2 text-xs font-medium text-gray-700">{item.name}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{item.total}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{item.active}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{item.completed}</td>
                  </tr>
                ))}
                {serviceSummary.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-8 text-center text-xs italic text-gray-400">কোন সেবা-ভিত্তিক তথ্য পাওয়া যায়নি</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {!itemFilter && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-bold text-gray-800">সেবা টাইপভিত্তিক রিপোর্ট</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">সেবা ক্যাটাগরি</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">টাইপ</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">মোট আবেদন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {serviceTypeSummary.map((item) => (
                  <tr key={`${item.category}-${item.requestType}`}>
                    <td className="px-3 py-2 text-xs font-medium text-gray-700">{item.categoryLabel}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{item.requestType}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{item.total}</td>
                  </tr>
                ))}
                {serviceTypeSummary.length === 0 && (
                  <tr><td colSpan={3} className="px-3 py-8 text-center text-xs italic text-gray-400">কোন টাইপভিত্তিক তথ্য পাওয়া যায়নি</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-bold text-gray-800">বিভাগভিত্তিক রিপোর্ট</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">বিভাগ</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">মোট</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">প্রক্রিয়াধীন</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">সম্পন্ন</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">বাতিল</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {divisionSummary.map((item) => (
                  <tr key={item.name}>
                    <td className="px-3 py-2 text-xs font-medium text-gray-700">{item.name}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{item.total}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{item.active}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{item.completed}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{item.rejected}</td>
                  </tr>
                ))}
                {divisionSummary.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-xs italic text-gray-400">কোন বিভাগভিত্তিক তথ্য পাওয়া যায়নি</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-bold text-gray-800">ইউজারভিত্তিক রিপোর্ট</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">ইউজার</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">বিভাগ</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">মোট</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">সম্পন্ন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {userSummary.slice(0, 12).map((item) => (
                  <tr key={item.email}>
                    <td className="px-3 py-2 text-xs font-medium text-gray-700">{item.name}<div className="text-[10px] text-gray-400">{item.email}</div></td>
                    <td className="px-3 py-2 text-xs text-gray-600">{item.division}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{item.total}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{item.completed}</td>
                  </tr>
                ))}
                {userSummary.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-8 text-center text-xs italic text-gray-400">কোন ইউজারভিত্তিক তথ্য পাওয়া যায়নি</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-bold text-gray-800">আইটেমভিত্তিক রিপোর্ট</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">আইটেম</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">মোট আবেদন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {itemSummary.slice(0, 20).map((item) => (
                <tr key={item.name}>
                  <td className="px-3 py-2 text-xs font-medium text-gray-700">{item.name}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{item.total}</td>
                </tr>
              ))}
              {itemSummary.length === 0 && (
                <tr><td colSpan={2} className="px-3 py-8 text-center text-xs italic text-gray-400">কোন আইটেমভিত্তিক তথ্য পাওয়া যায়নি</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-bold text-gray-800">প্রতিষ্ঠানব্যাপী আবেদন তালিকা</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">ট্র্যাকিং নং</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">আবেদনকারী</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">বিভাগ</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">সেবার ধরণ</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">অবস্থা</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">তারিখ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayApplications.map((app) => (
                <tr key={app.id}>
                  <td className="px-3 py-2 text-xs font-medium text-gray-700">{app.tracking_no}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{app.user_name}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{app.division}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{app.service_type}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{STATUS_CONFIG[app.status]?.label || app.status}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{app.submission_date}</td>
                </tr>
              ))}
              {displayApplications.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-xs italic text-gray-400">নির্বাচিত ফিল্টারে কোনো আবেদন পাওয়া যায়নি</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AllApplications({ user }: { user: UserData }) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [textSearch, setTextSearch] = useState('');

  useEffect(() => {
    fetch('/api/applications')
      .then(res => res.json())
      .then(data => setApplications(data))
      .catch(err => console.error('Error fetching all applications:', err))
      .finally(() => setLoading(false));
  }, []);

  const filteredApplications = applications.filter((app) => {
    const submittedAt = parseSubmissionDate(app.submission_date);
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo) : null;

    if (fromDate && submittedAt && submittedAt < fromDate) return false;
    if (toDate && submittedAt) {
      const inclusiveToDate = new Date(toDate);
      inclusiveToDate.setHours(23, 59, 59, 999);
      if (submittedAt > inclusiveToDate) return false;
    }
    if (serviceFilter && !app.service_type.includes(serviceFilter)) return false;
    if (statusFilter) {
      const appStatusLabel = STATUS_CONFIG[app.status]?.label || app.status;
      const selectedStatusLabel = STATUS_CONFIG[statusFilter]?.label || statusFilter;
      if (appStatusLabel !== selectedStatusLabel) return false;
    }
    if (!matchesTextQuery(textSearch, app.tracking_no, app.user_name, app.division, app.service_type, app.status)) return false;
    return true;
  });

  const printFilteredReport = () => {
    const reportWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!reportWindow) {
      alert('রিপোর্ট খোলা যায়নি। অনুগ্রহ করে পপ-আপ অনুমতি দিন।');
      return;
    }

    const activeServiceLabel = serviceFilter || 'সকল';
    const activeStatusLabel = statusFilter ? (STATUS_CONFIG[statusFilter]?.label || statusFilter) : 'সকল';
    const activeDateLabel = dateFrom || dateTo ? `${dateFrom || 'শুরু নেই'} - ${dateTo || 'শেষ নেই'}` : 'সকল সময়';

    const rows = filteredApplications.length > 0
      ? filteredApplications.map((app, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(app.tracking_no)}</td>
            <td>${escapeHtml(app.user_name)}</td>
            <td>${escapeHtml(app.division || '')}</td>
            <td>${escapeHtml(app.submission_date)}</td>
            <td>${escapeHtml(app.service_type)}</td>
            <td>${escapeHtml(STATUS_CONFIG[app.status]?.label || app.status)}</td>
          </tr>
        `).join('')
      : `<tr><td colspan="7" class="empty-row">নির্বাচিত ফিল্টারে কোনো আবেদন পাওয়া যায়নি</td></tr>`;

    reportWindow.document.write(`
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8" />
        <title>সকল আবেদন রিপোর্ট</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;700;800&display=swap');
          * { box-sizing: border-box; }
          body { margin: 0; padding: 28px; font-family: 'Noto Sans Bengali', sans-serif; color: #1f2937; background: #f8fafc; }
          .report { max-width: 1100px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 24px; padding: 32px; }
          .header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
          .title { margin: 0; font-size: 28px; font-weight: 800; }
          .subtitle { margin: 8px 0 0; font-size: 14px; color: #6b7280; }
          .meta { text-align: right; font-size: 13px; color: #4b5563; }
          .filters, .summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-bottom: 24px; }
          .filter-card, .card { border: 1px solid #e5e7eb; border-radius: 18px; padding: 14px 16px; background: #f8fafc; }
          .filter-label, .card-label { font-size: 11px; color: #6b7280; margin-bottom: 6px; }
          .filter-value { font-size: 16px; font-weight: 700; color: #111827; }
          .card-value { font-size: 28px; font-weight: 800; color: #111827; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          thead th { text-align: left; padding: 12px; background: #eff6ff; border-bottom: 1px solid #dbeafe; }
          tbody td { padding: 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
          .empty-row { text-align: center; color: #6b7280; padding: 28px; }
          @media print { body { background: #fff; padding: 0; } .report { border: none; border-radius: 0; padding: 0; } }
        </style>
      </head>
      <body>
        <div class="report">
          <div class="header">
            <div>
              <h1 class="title">সকল আবেদন রিপোর্ট</h1>
              <p class="subtitle">${escapeHtml(user.name_bn)}</p>
            </div>
            <div class="meta">
              <div>রিপোর্ট প্রস্তুতের তারিখ</div>
              <strong>${escapeHtml(new Date().toLocaleString('bn-BD'))}</strong>
            </div>
          </div>
          <div class="filters">
            <div class="filter-card"><div class="filter-label">তারিখ সীমা</div><div class="filter-value">${escapeHtml(activeDateLabel)}</div></div>
            <div class="filter-card"><div class="filter-label">সেবার ধরন</div><div class="filter-value">${escapeHtml(activeServiceLabel)}</div></div>
            <div class="filter-card"><div class="filter-label">অবস্থা</div><div class="filter-value">${escapeHtml(activeStatusLabel)}</div></div>
          </div>
          <div class="summary">
            <div class="card"><div class="card-label">মোট আবেদন</div><div class="card-value">${filteredApplications.length}</div></div>
            <div class="card"><div class="card-label">প্রক্রিয়াধীন</div><div class="card-value">${filteredApplications.filter((app) => ['Forwarded for Approval', 'In Progress', 'Presented in File'].includes(app.status)).length}</div></div>
            <div class="card"><div class="card-label">সম্পন্ন</div><div class="card-value">${filteredApplications.filter((app) => ['Done'].includes(app.status)).length}</div></div>
          </div>
          <table>
            <thead><tr><th>#</th><th>ট্র্যাকিং নম্বর</th><th>আবেদনকারী</th><th>বিভাগ</th><th>তারিখ</th><th>সেবার ধরন</th><th>অবস্থা</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  if (loading) return <div className="text-center py-10 text-gray-500 text-xs">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 font-['Noto_Sans_Bengali']">
        <div className="grid gap-4 xl:grid-cols-[280px_1fr] xl:items-start">
          <div className="self-start pt-1">
            <h3 className="text-sm font-bold text-gray-900">রিপোর্ট ও ফিল্টার</h3>
            <p className="mt-1 text-xs text-gray-500">তারিখ সীমা, সেবার ধরন এবং অবস্থা অনুযায়ী সকল আবেদন খুঁজুন ও রিপোর্ট নিন</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 xl:items-end">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-gray-500">টেবিল সার্চ</label>
              <input type="text" value={textSearch} onChange={(e) => setTextSearch(e.target.value)} placeholder="ট্র্যাকিং নম্বর, আবেদনকারী বা অবস্থা" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-gray-500">শুরুর তারিখ</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-gray-500">শেষের তারিখ</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-gray-500">সেবার ধরন</label>
              <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400">
                <option value="">সকল</option>
                {SERVICE_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-gray-500">অবস্থা</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400">
                <option value="">সকল</option>
                {REPORT_STATUS_OPTIONS.map((item) => <option key={item} value={item}>{STATUS_CONFIG[item]?.label || item}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-3 xl:justify-end">
              <button onClick={() => { setDateFrom(''); setDateTo(''); setServiceFilter(''); setStatusFilter(''); setTextSearch(''); }} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-100">রিসেট</button>
              <button onClick={printFilteredReport} className="inline-flex items-center gap-2 rounded-xl bg-[#1a3a6b] px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-800"><Printer className="h-4 w-4" /> রিপোর্ট / প্রিন্ট</button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">ট্র্যাকিং নম্বর</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">ইউজার</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">বিভাগ</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">সেবার ধরণ</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">অবস্থা</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredApplications.map((app) => (
              <tr key={app.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-4 text-xs font-bold text-blue-600">{app.tracking_no}</td>
                <td className="px-4 py-4 text-xs text-gray-800 font-medium">{app.user_name}</td>
                <td className="px-4 py-4 text-xs text-gray-500">{app.division}</td>
                <td className="px-4 py-4 text-xs text-gray-600">
                  <ServiceTypeSummary serviceType={app.service_type} />
                </td>
                <td className="px-4 py-4">
                  <ApplicationStatusSummary app={app} />
                </td>
                <td className="px-4 py-4 text-right">
                  <button 
                    onClick={() => setSelectedApp(app)}
                    className="text-[#1a3a6b] hover:text-blue-900 text-xs font-bold"
                  >
                    ম্যানেজ
                  </button>
                </td>
              </tr>
            ))}
            {filteredApplications.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-xs italic">কোন আবেদন খুঁজে পাওয়া যায়নি</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedApp && (
        <ApplicationViewModal app={selectedApp} onClose={() => setSelectedApp(null)} />
      )}
    </div>
  );
}

function SharedReportsPage() {
  const token = new URLSearchParams(window.location.search).get('token') || new URLSearchParams(window.location.search).get('api_key') || '';
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [itemFilter, setItemFilter] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      if (!token) {
        setError('API token is required.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/shared-data/reports', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.success) {
          throw new Error(data?.message || `Report API failed (${response.status})`);
        }
        setPayload(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Report could not be loaded.');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [token]);

  const applications = Array.isArray(payload?.applications) ? payload.applications as Application[] : [];
  const users = Array.isArray(payload?.users) ? payload.users as UserAccount[] : [];
  const divisions = Array.isArray(payload?.divisions) ? payload.divisions as Array<{ id: number; name: string }> : [];
  const categories = Array.isArray(payload?.settings?.categories) ? payload.settings.categories as ManagedCategory[] : [];
  const requestTypes = Array.isArray(payload?.settings?.requestTypes) ? payload.settings.requestTypes as string[] : [];
  const activeCategories = categories.filter((category) => category.active && category.key.trim());
  const categoryLabelMap = activeCategories.reduce<Record<string, string>>((acc, category) => {
    acc[category.key] = category.label || category.key;
    return acc;
  }, {});

  const getApplicationItemEntries = (serviceType: string) => (
    serviceType
      .split(', ')
      .filter(Boolean)
      .map((entry) => {
        const [rawCategory, rawDetail] = entry.split(' - ');
        const category = rawCategory?.trim();
        const detail = rawDetail?.trim();
        if (!category || !detail || requestTypes.includes(detail)) return null;
        return {
          category,
          detail,
          itemName: `${categoryLabelMap[category] || category} :: ${detail}`,
          originalEntry: entry,
        };
      })
      .filter((item): item is { category: string; detail: string; itemName: string; originalEntry: string } => Boolean(item))
  );

  const filteredApplications = applications.filter((app) => {
    const submittedAt = parseSubmissionDate(app.submission_date);
    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59`) : null;
    if (fromDate && submittedAt && submittedAt < fromDate) return false;
    if (toDate && submittedAt && submittedAt > toDate) return false;
    if (statusFilter && app.status !== statusFilter) return false;
    if (serviceFilter && !app.service_type.includes(serviceFilter)) return false;
    if (divisionFilter && app.division !== divisionFilter) return false;
    if (itemFilter && !getApplicationItemEntries(app.service_type).some((item) => item.itemName === itemFilter)) return false;
    return true;
  });

  const displayApplications = filteredApplications.map((app) => {
    if (!itemFilter) return app;
    const matchingEntries = getApplicationItemEntries(app.service_type)
      .filter((item) => item.itemName === itemFilter)
      .map((item) => item.originalEntry);
    return { ...app, service_type: matchingEntries.join(', ') || app.service_type };
  });

  const totalApplications = filteredApplications.length;
  const completedApplications = filteredApplications.filter((app) => app.status === 'Done').length;
  const activeApplications = filteredApplications.filter((app) => ['Forwarded for Approval', 'In Progress', 'Presented in File'].includes(app.status)).length;
  const rejectedApplications = filteredApplications.filter((app) => app.status === 'Rejected by Divisional Head').length;

  const divisionSummary = divisions
    .map((division) => {
      const divisionApplications = filteredApplications.filter((app) => app.division === division.name);
      return {
        name: division.name,
        total: divisionApplications.length,
        completed: divisionApplications.filter((app) => app.status === 'Done').length,
        active: divisionApplications.filter((app) => ['Forwarded for Approval', 'In Progress', 'Presented in File'].includes(app.status)).length,
        rejected: divisionApplications.filter((app) => app.status === 'Rejected by Divisional Head').length,
      };
    })
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);

  const userSummary = users
    .map((userAccount) => {
      const userApplications = filteredApplications.filter((app) => app.user_email === userAccount.email);
      return {
        email: userAccount.email,
        name: userAccount.name,
        division: userAccount.division || '-',
        total: userApplications.length,
        completed: userApplications.filter((app) => app.status === 'Done').length,
      };
    })
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);

  const serviceSummary = activeCategories.map((category) => {
    const matchingApplications = filteredApplications.filter((app) => app.service_type.includes(category.key));
    return {
      name: category.label,
      key: category.key,
      total: matchingApplications.length,
      completed: matchingApplications.filter((app) => app.status === 'Done').length,
      active: matchingApplications.filter((app) => ['Forwarded for Approval', 'In Progress', 'Presented in File'].includes(app.status)).length,
    };
  }).filter((item) => item.total > 0);

  const serviceTypeSummary = activeCategories.flatMap((category) =>
    requestTypes.map((requestType) => ({
      category: category.key,
      categoryLabel: category.label,
      requestType,
      total: filteredApplications.filter((app) => app.service_type.includes(`${category.key} - ${requestType}`)).length,
    }))
  ).filter((item) => item.total > 0);

  const itemSummary = Array.from(
    filteredApplications.reduce((acc, app) => {
      getApplicationItemEntries(app.service_type).forEach((item) => {
        if (itemFilter && item.itemName !== itemFilter) return;
        acc.set(item.itemName, (acc.get(item.itemName) || 0) + 1);
      });
      return acc;
    }, new Map<string, number>())
  ).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);

  const itemOptions = activeCategories.flatMap((category) => category.items.map((item) => `${category.label} :: ${item}`)).sort((a, b) => a.localeCompare(b, 'bn'));

  if (loading) {
    return <div className="min-h-screen bg-gray-50 p-8 text-center text-sm text-gray-500">Loading shared report...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-100 bg-white p-6 text-sm text-red-700 shadow-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-blue-600">Shared Reports</div>
              <h1 className="mt-2 text-xl font-black text-[#1a3a6b]">UGC IT Service Request Report</h1>
              <p className="mt-1 text-xs text-gray-500">Read-only shared report view with live filters.</p>
            </div>
            <button onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a3a6b] px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-800">
              <Printer className="h-4 w-4" /> Print / PDF
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
              <option value="">All status</option>
              {REPORT_STATUS_OPTIONS.map((item) => <option key={item} value={item}>{STATUS_CONFIG[item]?.label || item}</option>)}
            </select>
            <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
              <option value="">All service</option>
              {activeCategories.map((item) => <option key={item.id} value={item.key}>{item.label}</option>)}
            </select>
            <select value={divisionFilter} onChange={(e) => setDivisionFilter(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
              <option value="">All division</option>
              {divisions.map((division) => <option key={division.id} value={division.name}>{division.name}</option>)}
            </select>
            <select value={itemFilter} onChange={(e) => setItemFilter(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
              <option value="">All item</option>
              {itemOptions.map((itemName) => <option key={itemName} value={itemName}>{itemName}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <UserReportStatCard label="মোট আবেদন" value={totalApplications} color="blue" />
          <UserReportStatCard label="প্রক্রিয়াধীন" value={activeApplications} color="yellow" />
          <UserReportStatCard label="সম্পন্ন" value={completedApplications} color="green" />
          <UserReportStatCard label="বাতিল" value={rejectedApplications} color="red" />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <SharedSummaryTable title="সেবার ধরণভিত্তিক রিপোর্ট" headers={['ধরণ', 'মোট', 'প্রক্রিয়াধীন', 'সম্পন্ন']} rows={serviceSummary.map((item) => [item.name, item.total, item.active, item.completed])} />
          <SharedSummaryTable title="বিভাগভিত্তিক রিপোর্ট" headers={['বিভাগ', 'মোট', 'প্রক্রিয়াধীন', 'সম্পন্ন', 'বাতিল']} rows={divisionSummary.map((item) => [item.name, item.total, item.active, item.completed, item.rejected])} />
          {!itemFilter && <SharedSummaryTable title="সেবা টাইপভিত্তিক রিপোর্ট" headers={['ক্যাটাগরি', 'টাইপ', 'মোট']} rows={serviceTypeSummary.map((item) => [item.categoryLabel, item.requestType, item.total])} />}
          <SharedSummaryTable title="ইউজারভিত্তিক রিপোর্ট" headers={['ইউজার', 'বিভাগ', 'মোট', 'সম্পন্ন']} rows={userSummary.slice(0, 12).map((item) => [`${item.name} (${item.email})`, item.division, item.total, item.completed])} />
        </div>

        <SharedSummaryTable title="আইটেমভিত্তিক রিপোর্ট" headers={['আইটেম', 'মোট আবেদন']} rows={itemSummary.slice(0, 20).map((item) => [item.name, item.total])} />

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800">প্রতিষ্ঠানব্যাপী আবেদন তালিকা</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['ট্র্যাকিং নং', 'আবেদনকারী', 'বিভাগ', 'সেবার ধরণ', 'অবস্থা', 'তারিখ'].map((header) => (
                    <th key={header} className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-400">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayApplications.map((app) => (
                  <tr key={app.id}>
                    <td className="px-3 py-2 text-xs font-medium text-gray-700">{app.tracking_no}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{app.user_name}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{app.division}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{app.service_type}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{STATUS_CONFIG[app.status]?.label || app.status}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{app.submission_date}</td>
                  </tr>
                ))}
                {displayApplications.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-xs italic text-gray-400">No applications matched the selected filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function SharedSummaryTable({ title, headers, rows }: { title: string; headers: string[]; rows: Array<Array<string | number>> }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>{headers.map((header) => <th key={header} className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-400">{header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2 text-xs text-gray-600">{cell}</td>)}</tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={headers.length} className="px-3 py-8 text-center text-xs italic text-gray-400">No data available.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ApiSettings() {
  const [dataShareClients, setDataShareClients] = useState<DataShareClient[]>([]);
  const [accessLogs, setAccessLogs] = useState<DataShareAccessLog[]>([]);
  const [logDirection, setLogDirection] = useState<'All' | 'Pull' | 'Push'>('All');
  const [newDataShareClientName, setNewDataShareClientName] = useState('');
  const [newDataShareScopes, setNewDataShareScopes] = useState<DataShareScope[]>([]);
  const [generatedDataShareToken, setGeneratedDataShareToken] = useState('');
  const [dataShareTokenCopyStatus, setDataShareTokenCopyStatus] = useState('');

  const fetchDataShareClients = async () => {
    try {
      const response = await fetch('/api/data-share/clients');
      if (!response.ok) return;
      const data = await response.json();
      setDataShareClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching data-share clients:', error);
    }
  };

  const fetchAccessLogs = async (direction = logDirection) => {
    try {
      const query = direction === 'All' ? '' : `?direction=${direction}`;
      const response = await fetch(`/api/data-share/logs${query}`);
      if (!response.ok) return;
      const data = await response.json();
      setAccessLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching data-share logs:', error);
    }
  };

  useEffect(() => {
    fetchDataShareClients();
    fetchAccessLogs('All');
  }, []);

  const toggleDataShareScope = (scope: DataShareScope, checked: boolean) => {
    setNewDataShareScopes((prev) =>
      checked ? Array.from(new Set([...prev, scope])) : prev.filter((item) => item !== scope)
    );
  };

  const createDataShareClient = async () => {
    const name = newDataShareClientName.trim();
    if (!name) {
      alert('API client name is required.');
      return;
    }
    if (newDataShareScopes.length === 0) {
      alert('Select at least one data type to share.');
      return;
    }

    try {
      const response = await fetch('/api/data-share/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, scopes: newDataShareScopes }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'API client could not be created.');
      }
      setGeneratedDataShareToken(payload.token || '');
      setNewDataShareClientName('');
      setNewDataShareScopes([]);
      fetchDataShareClients();
      fetchAccessLogs();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'API client could not be created.');
    }
  };

  const revokeDataShareClient = async (clientId: number) => {
    if (!confirm('Revoke this API access? Existing integrations using this key will stop working.')) return;
    try {
      const response = await fetch(`/api/data-share/clients/${clientId}/revoke`, { method: 'PUT' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'API client could not be revoked.');
      }
      fetchDataShareClients();
      fetchAccessLogs();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'API client could not be revoked.');
    }
  };

  const copyGeneratedDataShareToken = async () => {
    if (!generatedDataShareToken) return;

    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(generatedDataShareToken);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = generatedDataShareToken;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!copied) throw new Error('Copy command failed');
      }

      setDataShareTokenCopyStatus('Copied');
      window.setTimeout(() => setDataShareTokenCopyStatus(''), 2000);
    } catch (error) {
      console.error('Error copying API token:', error);
      setDataShareTokenCopyStatus('Copy failed. Select the token and copy manually.');
    }
  };

  const updateLogDirection = (direction: 'All' | 'Pull' | 'Push') => {
    setLogDirection(direction);
    fetchAccessLogs(direction);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
        <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-600">Controlled API sharing</div>
            <h3 className="mt-2 text-lg font-bold text-[#1a3a6b]">Data share clients</h3>
            <p className="mt-1 text-xs text-gray-500">Create read-only API keys and choose exactly which data types another app can read.</p>
          </div>

          {generatedDataShareToken && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-bold text-amber-800">New API token. Store it now; it will not be shown again.</p>
              <div className="mt-2 break-all rounded-xl border border-amber-100 bg-white p-2 text-xs font-mono text-gray-700">
                {generatedDataShareToken}
              </div>
              <button type="button" onClick={copyGeneratedDataShareToken} className="mt-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white">
                Copy token
              </button>
              {dataShareTokenCopyStatus && <span className="ml-2 text-xs font-semibold text-amber-800">{dataShareTokenCopyStatus}</span>}
            </div>
          )}

          <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-4">
            <input
              type="text"
              value={newDataShareClientName}
              onChange={(e) => setNewDataShareClientName(e.target.value)}
              placeholder="Client app name"
              className="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-emerald-400"
            />
            <div className="mt-3 grid gap-2">
              {DATA_SHARE_SCOPE_OPTIONS.map((scope) => (
                <label key={scope.id} className="flex items-center gap-2 text-xs font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={newDataShareScopes.includes(scope.id)}
                    onChange={(e) => toggleDataShareScope(scope.id, e.target.checked)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span>{scope.name}</span>
                </label>
              ))}
            </div>
            <button type="button" onClick={createDataShareClient} className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-800">
              <PlusCircle className="h-4 w-4" />
              Create API key
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {dataShareClients.map((client) => (
              <div key={client.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{client.name}</p>
                    <p className="mt-1 text-[11px] text-gray-500">
                      {client.scopes.map((scope) => DATA_SHARE_SCOPE_OPTIONS.find((item) => item.id === scope)?.name || scope).join(', ')}
                    </p>
                    <p className="mt-1 text-[10px] text-gray-400">Last used: {client.last_used_at || 'Never'}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${client.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                    {client.status}
                  </span>
                </div>
                {client.status === 'Active' && (
                  <button type="button" onClick={() => revokeDataShareClient(client.id)} className="mt-3 rounded-lg border border-red-100 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">
                    Revoke
                  </button>
                )}
              </div>
            ))}
            {dataShareClients.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-center text-xs text-gray-500">
                No API clients created yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-blue-600">API activity</div>
              <h3 className="mt-2 text-lg font-bold text-[#1a3a6b]">Push and pull logs</h3>
              <p className="mt-1 text-xs text-gray-500">Tracks shared API calls, endpoint, dataset, row count, IP, and client app.</p>
            </div>
            <div className="flex gap-2">
              {(['All', 'Pull', 'Push'] as const).map((direction) => (
                <button
                  key={direction}
                  type="button"
                  onClick={() => updateLogDirection(direction)}
                  className={`rounded-xl px-3 py-2 text-xs font-bold ${logDirection === direction ? 'bg-[#1a3a6b] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {direction}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[520px] overflow-auto rounded-2xl border border-gray-100">
            <table className="min-w-[860px] w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500 shadow-sm">
                <tr>
                  <th className="px-3 py-3">Time</th>
                  <th className="px-3 py-3">Direction</th>
                  <th className="px-3 py-3">Client</th>
                  <th className="px-3 py-3">Scope</th>
                  <th className="px-3 py-3">Endpoint</th>
                  <th className="px-3 py-3">Rows</th>
                  <th className="px-3 py-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {accessLogs.map((log) => (
                  <tr key={log.id} className="align-top">
                    <td className="px-3 py-3 text-gray-600">{log.created_at}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${log.direction === 'Pull' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {log.direction}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-gray-700">{log.client_name || 'Unknown'}</td>
                    <td className="px-3 py-3 text-gray-600">{log.scope}</td>
                    <td className="px-3 py-3 font-mono text-[11px] text-gray-600">{log.method} {log.endpoint}</td>
                    <td className="px-3 py-3 text-gray-600">{log.row_count}</td>
                    <td className="px-3 py-3 text-gray-600">{log.ip || '-'}</td>
                  </tr>
                ))}
                {accessLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-xs italic text-gray-400">
                      No API activity logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function SystemSettings() {
  const liveSettings = useSystemSettings();
  const quickLinkFileInputRef = useRef<HTMLInputElement | null>(null);
  const dailyQuoteFileInputRef = useRef<HTMLInputElement | null>(null);
  const brandingLogoInputRef = useRef<HTMLInputElement | null>(null);
  const officerOptions = [
    { value: 'desk_officer_hardware', label: 'ডেস্ক অফিসার (হার্ডওয়্যার)' },
    { value: 'desk_officer_network', label: 'ডেস্ক অফিসার (নেটওয়ার্ক)' },
    { value: 'desk_officer_software', label: 'ডেস্ক অফিসার (সফটওয়্যার)' },
    { value: 'desk_officer_maintenance', label: 'ডেস্ক অফিসার (মেইনটেন্যান্স)' },
  ];

  const [settings, setSettings] = useState<AppSystemSettings>(liveSettings);
  const [newRequestType, setNewRequestType] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryItemDrafts, setNewCategoryItemDrafts] = useState<Record<string, string>>({});
  const [newDailyQuoteText, setNewDailyQuoteText] = useState('');
  const [newDailyQuoteAuthor, setNewDailyQuoteAuthor] = useState('');
  const [newQuickLinkTitle, setNewQuickLinkTitle] = useState('');
  const [newQuickLinkDescription, setNewQuickLinkDescription] = useState('');
  const [newQuickLinkUrl, setNewQuickLinkUrl] = useState('');
  const [newQuickLinkResolvedUrl, setNewQuickLinkResolvedUrl] = useState('');
  const [newQuickLinkUploadName, setNewQuickLinkUploadName] = useState('');
  const [brandingLogoUploadName, setBrandingLogoUploadName] = useState('');
  const [dataShareClients, setDataShareClients] = useState<DataShareClient[]>([]);
  const [newDataShareClientName, setNewDataShareClientName] = useState('');
  const [newDataShareScopes, setNewDataShareScopes] = useState<DataShareScope[]>([]);
  const [generatedDataShareToken, setGeneratedDataShareToken] = useState('');
  const [dataShareTokenCopyStatus, setDataShareTokenCopyStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSettings(liveSettings);
  }, [liveSettings]);

  const fetchDataShareClients = async () => {
    try {
      const response = await fetch('/api/data-share/clients');
      if (!response.ok) return;
      const data = await response.json();
      setDataShareClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching data-share clients:', error);
    }
  };

  useEffect(() => {
    fetchDataShareClients();
  }, []);

  const updateCategory = (id: string, changes: Partial<ManagedCategory>) => {
    setSettings((prev) => ({
      ...prev,
      categories: prev.categories.map((category) => category.id === id ? { ...category, ...changes } : category),
    }));
  };

  const addCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      alert('নতুন ক্যাটাগরির নাম লিখুন।');
      return;
    }

    setSettings((prev) => ({
      ...prev,
      categories: [
        ...prev.categories,
        {
          id: `custom-${Date.now()}`,
          key: trimmed,
          label: trimmed,
          items: [],
          officerRole: '',
          active: true,
        },
      ],
    }));
    setNewCategoryName('');
  };

  const removeCategory = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      categories: prev.categories.filter((category) => category.id !== id),
    }));
  };

  const addItemToCategory = (id: string) => {
    const draft = (newCategoryItemDrafts[id] || '').trim();
    if (!draft) return;

    setSettings((prev) => ({
      ...prev,
      categories: prev.categories.map((category) => {
        if (category.id !== id) return category;
        if (category.items.includes(draft)) return category;
        return { ...category, items: [...category.items, draft] };
      }),
    }));
    setNewCategoryItemDrafts((prev) => ({ ...prev, [id]: '' }));
  };

  const removeItemFromCategory = (id: string, itemName: string) => {
    setSettings((prev) => ({
      ...prev,
      categories: prev.categories.map((category) =>
        category.id === id
          ? { ...category, items: category.items.filter((item) => item !== itemName) }
          : category
      ),
    }));
  };

  const addRequestType = () => {
    const trimmed = newRequestType.trim();
    if (!trimmed) return;

    setSettings((prev) => ({
      ...prev,
      requestTypes: prev.requestTypes.includes(trimmed) ? prev.requestTypes : [...prev.requestTypes, trimmed],
    }));
    setNewRequestType('');
  };

  const removeRequestType = (typeName: string) => {
    setSettings((prev) => ({
      ...prev,
      requestTypes: prev.requestTypes.filter((item) => item !== typeName),
    }));
  };

  const updateDailyQuote = (index: number, changes: Partial<DailyQuote>) => {
    setSettings((prev) => ({
      ...prev,
      dailyQuotes: prev.dailyQuotes.map((quote, quoteIndex) => quoteIndex === index ? { ...quote, ...changes } : quote),
    }));
  };

  const addDailyQuote = () => {
    const quote = newDailyQuoteText.trim();
    const author = newDailyQuoteAuthor.trim() || 'দৈনিক বাণী';
    if (!quote) {
      alert('নতুন বাণীর টেক্সট লিখুন।');
      return;
    }

    setSettings((prev) => ({
      ...prev,
      dailyQuotes: [...prev.dailyQuotes, { quote, author }],
    }));
    setNewDailyQuoteText('');
    setNewDailyQuoteAuthor('');
  };

  const removeDailyQuote = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      dailyQuotes: prev.dailyQuotes.filter((_, quoteIndex) => quoteIndex !== index),
    }));
  };

  const handleDailyQuoteUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const raw = typeof reader.result === 'string' ? reader.result : '';
      if (!raw.trim()) {
        alert('ফাইলটিতে কোনো বাণী পাওয়া যায়নি।');
        return;
      }

      try {
        const nextQuotes: DailyQuote[] = [];
        if (file.name.toLowerCase().endsWith('.json')) {
          const parsed = JSON.parse(raw) as Array<{ quote?: string; author?: string } | string>;
          for (const item of parsed) {
            if (typeof item === 'string' && item.trim()) {
              nextQuotes.push({ quote: item.trim(), author: 'দৈনিক বাণী' });
            } else if (item && typeof item === 'object' && typeof item.quote === 'string' && item.quote.trim()) {
              nextQuotes.push({
                quote: item.quote.trim(),
                author: typeof item.author === 'string' && item.author.trim() ? item.author.trim() : 'দৈনিক বাণী',
              });
            }
          }
        } else {
          const lines = raw
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);

          for (const line of lines) {
            const pipeParts = line.split('|');
            if (pipeParts.length >= 2) {
              nextQuotes.push({
                quote: pipeParts[0].trim(),
                author: pipeParts.slice(1).join('|').trim() || 'দৈনিক বাণী',
              });
              continue;
            }

            const commaIndex = line.lastIndexOf(',');
            if (commaIndex > 0) {
              nextQuotes.push({
                quote: line.slice(0, commaIndex).trim(),
                author: line.slice(commaIndex + 1).trim() || 'দৈনিক বাণী',
              });
              continue;
            }

            nextQuotes.push({ quote: line, author: 'দৈনিক বাণী' });
          }
        }

        if (nextQuotes.length === 0) {
          alert('ফাইল থেকে কোনো বৈধ বাণী পাওয়া যায়নি।');
          return;
        }

        setSettings((prev) => ({
          ...prev,
          dailyQuotes: nextQuotes,
        }));
        alert(`${nextQuotes.length} টি বাণী লোড করা হয়েছে।`);
      } catch (error) {
        console.error('Error parsing quote file:', error);
        alert('বাণীর ফাইলটি পড়া যায়নি। JSON, TXT বা CSV ফাইল দিন।');
      }
    };

    reader.onerror = () => {
      alert('ফাইলটি পড়া যায়নি। আবার চেষ্টা করুন।');
    };

    reader.readAsText(file, 'utf-8');
    event.target.value = '';
  };

  const updateQuickLink = (id: string, changes: Partial<QuickLinkItem>) => {
    setSettings((prev) => ({
      ...prev,
      quickLinks: prev.quickLinks.map((link) => link.id === id ? { ...link, ...changes } : link),
    }));
  };

  const updateFormBranding = (changes: Partial<FormBranding>) => {
    setSettings((prev) => ({
      ...prev,
      formBranding: {
        ...prev.formBranding,
        ...changes,
      },
    }));
  };

  const addQuickLink = () => {
    const title = newQuickLinkTitle.trim();
    const url = newQuickLinkResolvedUrl.trim() || newQuickLinkUrl.trim();
    if (!title || !url) {
      alert('দ্রুত লিংকের নাম এবং URL/PDF path অথবা upload করা file দিন।');
      return;
    }

    setSettings((prev) => ({
      ...prev,
      quickLinks: [
        ...prev.quickLinks,
        {
          id: `quick-link-${Date.now()}`,
          title,
          description: newQuickLinkDescription.trim(),
          url,
        },
      ],
    }));
    setNewQuickLinkTitle('');
    setNewQuickLinkDescription('');
    setNewQuickLinkUrl('');
    setNewQuickLinkResolvedUrl('');
    setNewQuickLinkUploadName('');
  };

  const removeQuickLink = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      quickLinks: prev.quickLinks.filter((link) => link.id !== id),
    }));
  };

  const handleQuickLinkFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > QUICK_LINK_MAX_UPLOAD_BYTES) {
      alert('ফাইলের আকার সর্বোচ্চ ৫ MB হতে হবে।');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        alert('ফাইলটি পড়া যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।');
        return;
      }

      try {
        const response = await fetch('/api/system-settings/upload-quick-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type,
            dataUrl: result,
          }),
        });

        const rawText = await response.text();
        let payload: any = null;
        try {
          payload = rawText ? JSON.parse(rawText) : null;
        } catch {
          payload = null;
        }
        if (!response.ok || !payload?.success || !payload?.url) {
          throw new Error(payload?.message || rawText || `Upload failed (${response.status})`);
        }

        setNewQuickLinkUrl(payload.url);
        setNewQuickLinkResolvedUrl(payload.url);
        setNewQuickLinkUploadName(`${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
        if (!newQuickLinkTitle.trim()) {
          setNewQuickLinkTitle(file.name.replace(/\.[^.]+$/, ''));
        }
        if (!newQuickLinkDescription.trim()) {
          setNewQuickLinkDescription('আপলোডকৃত ফাইল');
        }
      } catch (error) {
        alert(error instanceof Error ? error.message : 'ফাইলটি upload করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।');
      }
    };
    reader.onerror = () => {
      alert('ফাইলটি upload করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleBrandingLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > QUICK_LINK_MAX_UPLOAD_BYTES) {
      alert('লোগো ফাইলের আকার সর্বোচ্চ ৫ MB হতে হবে।');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        alert('লোগো ফাইলটি পড়া যায়নি।');
        return;
      }

      try {
        const response = await fetch('/api/system-settings/upload-quick-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type,
            dataUrl: result,
          }),
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success || !payload?.url) {
          throw new Error(payload?.message || 'লোগো আপলোড করা যায়নি।');
        }
        setBrandingLogoUploadName(file.name);
        const nextSettings = {
          ...settings,
          formBranding: {
            ...settings.formBranding,
            logoUrl: payload.url,
          },
        };
        setSettings(nextSettings);
        await persistSystemSettings(nextSettings);
      } catch (error) {
        console.error('Error uploading branding logo:', error);
        alert(error instanceof Error ? error.message : 'লোগো আপলোড করা যায়নি।');
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const activeCategories = settings.categories.filter((category) => category.active);
  const totalItems = activeCategories.reduce((sum, category) => sum + category.items.length, 0);
  const activeDailyQuote = settings.dailyQuotes.length > 0 ? getDailyTechQuote(settings) : null;

  const persistSystemSettings = async (nextSettings: AppSystemSettings, showSuccessAlert = false) => {
    const response = await fetch('/api/system-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextSettings),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const savedSettings = normalizeSystemSettings(await response.json() as Partial<AppSystemSettings>);
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(savedSettings));
    window.dispatchEvent(new Event(SETTINGS_UPDATED_EVENT));
    setSettings(savedSettings);
    if (showSuccessAlert) {
      alert('সিস্টেম সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে।');
    }
    return savedSettings;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/system-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const savedSettings = normalizeSystemSettings(await response.json() as Partial<AppSystemSettings>);
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(savedSettings));
      window.dispatchEvent(new Event(SETTINGS_UPDATED_EVENT));
      setSettings(savedSettings);
      alert('সিস্টেম সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে।');
    } catch (error) {
      console.error('Error saving system settings:', error);
      alert('সেটিংস সংরক্ষণ করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setSaving(false);
    }
  };

  const toggleDataShareScope = (scope: DataShareScope, checked: boolean) => {
    setNewDataShareScopes((prev) =>
      checked
        ? Array.from(new Set([...prev, scope]))
        : prev.filter((item) => item !== scope)
    );
  };

  const createDataShareClient = async () => {
    const name = newDataShareClientName.trim();
    if (!name) {
      alert('API client name is required.');
      return;
    }
    if (newDataShareScopes.length === 0) {
      alert('Select at least one data type to share.');
      return;
    }

    try {
      const response = await fetch('/api/data-share/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, scopes: newDataShareScopes }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'API client could not be created.');
      }
      setGeneratedDataShareToken(payload.token || '');
      setNewDataShareClientName('');
      setNewDataShareScopes([]);
      fetchDataShareClients();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'API client could not be created.');
    }
  };

  const revokeDataShareClient = async (clientId: number) => {
    if (!confirm('Revoke this API access? Existing integrations using this key will stop working.')) return;
    try {
      const response = await fetch(`/api/data-share/clients/${clientId}/revoke`, { method: 'PUT' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'API client could not be revoked.');
      }
      fetchDataShareClients();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'API client could not be revoked.');
    }
  };

  const copyGeneratedDataShareToken = async () => {
    if (!generatedDataShareToken) return;

    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(generatedDataShareToken);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = generatedDataShareToken;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!copied) throw new Error('Copy command failed');
      }

      setDataShareTokenCopyStatus('Copied');
      window.setTimeout(() => setDataShareTokenCopyStatus(''), 2000);
    } catch (error) {
      console.error('Error copying API token:', error);
      setDataShareTokenCopyStatus('Copy failed. Select the token and copy manually.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="space-y-6">
          <div>
            <h3 className="mb-4 text-sm font-bold text-gray-700">সাধারণ সেটিংস</h3>
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, emailNotifications: !prev.emailNotifications }))}
                className="flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
              >
                <div>
                  <p className="text-sm font-bold text-gray-800">ইমেইল নোটিফিকেশন</p>
                  <p className="text-xs text-gray-500">নতুন আবেদন এলে সংশ্লিষ্টদের নোটিফিকেশন পাঠানো হবে</p>
                </div>
                <div className={`relative h-7 w-14 rounded-full transition ${settings.emailNotifications ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${settings.emailNotifications ? 'right-1' : 'left-1'}`}></div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, maintenanceMode: !prev.maintenanceMode }))}
                className="flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-4 text-left transition hover:border-amber-200 hover:bg-amber-50/50"
              >
                <div>
                  <p className="text-sm font-bold text-gray-800">সিস্টেম মেইনটেন্যান্স মোড</p>
                  <p className="text-xs text-gray-500">চালু করলে ইউজারদের জন্য সিস্টেম সাময়িকভাবে সীমিত করা যাবে</p>
                </div>
                <div className={`relative h-7 w-14 rounded-full transition ${settings.maintenanceMode ? 'bg-amber-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${settings.maintenanceMode ? 'right-1' : 'left-1'}`}></div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-700">দৈনিক বাণী ম্যানেজমেন্ট</h3>
                <p className="mt-1 text-xs text-gray-500">লগইন পেজের quote section চালু/বন্ধ করুন এবং বাণী সংরক্ষণ করুন</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const nextSettings = { ...settings, dailyQuotesEnabled: !settings.dailyQuotesEnabled };
                  setSettings(nextSettings);
                  try {
                    await persistSystemSettings(nextSettings);
                  } catch (error) {
                    console.error('Error updating daily quote status:', error);
                    setSettings(settings);
                    alert('দৈনিক বাণীর অবস্থা আপডেট করা যায়নি।');
                  }
                }}
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${settings.dailyQuotesEnabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}
              >
                {settings.dailyQuotesEnabled ? 'চালু' : 'বন্ধ'}
              </button>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-4">
              <input
                ref={dailyQuoteFileInputRef}
                type="file"
                accept=".json,.txt,.csv"
                onChange={handleDailyQuoteUpload}
                className="hidden"
              />
              <div className="grid gap-2">
                <textarea
                  value={newDailyQuoteText}
                  onChange={(e) => setNewDailyQuoteText(e.target.value)}
                  rows={3}
                  placeholder="নতুন বাণী লিখুন"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400"
                />
                <input
                  type="text"
                  value={newDailyQuoteAuthor}
                  onChange={(e) => setNewDailyQuoteAuthor(e.target.value)}
                  placeholder="লেখক / উৎস"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400"
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={addDailyQuote} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a3a6b] px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-800">
                    <PlusCircle className="h-4 w-4" />
                    বাণী যোগ করুন
                  </button>
                  <button type="button" onClick={() => dailyQuoteFileInputRef.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 px-4 py-2 text-sm font-bold text-blue-600 transition hover:bg-blue-50">
                    <Upload className="h-4 w-4" />
                    JSON / TXT / CSV আপলোড
                  </button>
                </div>
                <div className="text-xs text-gray-500">
                  TXT/CSV-তে প্রতিটি লাইনে `বাণী|লেখক` ফরম্যাট ব্যবহার করতে পারবেন।
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="text-xs font-bold text-gray-700">সংরক্ষিত বাণী</h4>
                  <span className="text-[11px] text-gray-400">মোট {settings.dailyQuotes.length} টি</span>
                </div>
                <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold text-blue-800">বর্তমান সক্রিয় বাণী</p>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${settings.dailyQuotesEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                      {settings.dailyQuotesEnabled ? 'চালু' : 'বন্ধ'}
                    </span>
                  </div>
                  {activeDailyQuote ? (
                    <>
                      <p className="mt-2 text-sm font-semibold text-gray-800">{activeDailyQuote.quote}</p>
                      <p className="mt-1 text-xs text-gray-500">{activeDailyQuote.author}</p>
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500">সংরক্ষিত কোনো বাণী নেই।</p>
                  )}
                </div>
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {settings.dailyQuotes.map((quote, index) => (
                    <div key={`daily-quote-${index}`} className="rounded-xl border border-gray-200 bg-white p-3">
                      <div className="grid gap-2">
                        <textarea
                          value={quote.quote}
                          onChange={(e) => updateDailyQuote(index, { quote: e.target.value })}
                          rows={2}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400"
                        />
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            type="text"
                            value={quote.author}
                            onChange={(e) => updateDailyQuote(index, { author: e.target.value })}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400"
                          />
                          <button type="button" onClick={() => removeDailyQuote(index)} className="inline-flex items-center justify-center rounded-xl border border-red-100 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50">
                            <Trash2 className="mr-2 h-4 w-4" />
                            মুছুন
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {settings.dailyQuotes.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-xs text-gray-500">
                      এখনো কোনো দৈনিক বাণী সংরক্ষণ করা হয়নি।
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-700">আইটি সেবা ফরম ব্র্যান্ডিং</h3>
              <p className="mt-1 text-xs text-gray-500">ফরমের হেডার টেক্সট ও লোগো এখানে পরিবর্তন করুন।</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-4">
              <input
                ref={brandingLogoInputRef}
                type="file"
                accept="image/*"
                onChange={handleBrandingLogoUpload}
                className="hidden"
              />
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                  <img src={settings.formBranding.logoUrl} alt="Form logo" className="max-h-24 w-auto object-contain" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button type="button" onClick={() => brandingLogoInputRef.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 px-4 py-2 text-sm font-bold text-blue-600 transition hover:bg-blue-50">
                      <Upload className="h-4 w-4" />
                      লোগো আপলোড
                    </button>
                    <input
                      type="text"
                      value={settings.formBranding.logoUrl}
                      onChange={(e) => updateFormBranding({ logoUrl: e.target.value })}
                      placeholder="লোগোর URL"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400"
                    />
                  </div>
                  {brandingLogoUploadName && <p className="text-xs text-gray-500">আপলোডকৃত ফাইল: {brandingLogoUploadName}</p>}
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input type="text" value={settings.formBranding.headerTitleBn} onChange={(e) => updateFormBranding({ headerTitleBn: e.target.value })} placeholder="বাংলা হেডার" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400" />
                <input type="text" value={settings.formBranding.headerTitleEn} onChange={(e) => updateFormBranding({ headerTitleEn: e.target.value })} placeholder="English header" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400" />
                <input type="text" value={settings.formBranding.headerAddress} onChange={(e) => updateFormBranding({ headerAddress: e.target.value })} placeholder="ঠিকানা" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400 md:col-span-2" />
                <input type="text" value={settings.formBranding.headerWebsite} onChange={(e) => updateFormBranding({ headerWebsite: e.target.value })} placeholder="ওয়েবসাইট" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400" />
                <input type="text" value={settings.formBranding.formTitle} onChange={(e) => updateFormBranding({ formTitle: e.target.value })} placeholder="ফরম শিরোনাম" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400" />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => persistSystemSettings(settings, true)}
                  className="rounded-xl bg-[#1a3a6b] px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-800"
                >
                  ব্র্যান্ডিং আপডেট করুন
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-700">সেবা টাইপ সেটিংস</h3>
                <p className="mt-1 text-xs text-gray-500">ফর্ম ও রিপোর্টে ব্যবহৃত টাইপগুলো এখান থেকে নিয়ন্ত্রণ করুন</p>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <div className="flex flex-wrap gap-2">
                {settings.requestTypes.map((typeName) => (
                  <span key={typeName} className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                    {typeName}
                    {settings.requestTypes.length > 1 && (
                      <button type="button" onClick={() => removeRequestType(typeName)} className="text-blue-400 transition hover:text-red-500">×</button>
                    )}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={newRequestType}
                  onChange={(e) => setNewRequestType(e.target.value)}
                  placeholder="নতুন সেবা টাইপ"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400"
                />
                <button type="button" onClick={addRequestType} className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 px-4 py-2 text-sm font-bold text-blue-600 transition hover:bg-blue-50">
                  <PlusCircle className="h-4 w-4" />
                  টাইপ যোগ করুন
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-700">ক্যাটাগরি ও আইটেম ম্যানেজমেন্ট</h3>
                <p className="mt-1 text-xs text-gray-500">ফর্ম, রিপোর্ট এবং officer assignment-এর জন্য একক source of truth</p>
              </div>
            </div>

            <div className="mb-4 rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="নতুন ক্যাটাগরির নাম"
                  className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400"
                />
                <button type="button" onClick={addCategory} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a3a6b] px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-800">
                  <PlusCircle className="h-4 w-4" />
                  নতুন ক্যাটাগরি
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {settings.categories.map((category) => (
                <div key={category.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="grid flex-1 gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-gray-500">ক্যাটাগরি নাম</label>
                        <input
                          type="text"
                          value={category.key}
                          onChange={(e) => updateCategory(category.id, { key: e.target.value })}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-gray-500">প্রদর্শিত শিরোনাম</label>
                        <input
                          type="text"
                          value={category.label}
                          onChange={(e) => updateCategory(category.id, { label: e.target.value })}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-gray-500">দায়িত্বপ্রাপ্ত অফিসার</label>
                        <select
                          value={category.officerRole}
                          onChange={(e) => updateCategory(category.id, { officerRole: e.target.value })}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400"
                        >
                          <option value="">নির্বাচন করুন</option>
                          {officerOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </div>
                      <div className="flex items-end gap-3">
                        <button
                          type="button"
                          onClick={() => updateCategory(category.id, { active: !category.active })}
                          className={`inline-flex h-11 items-center rounded-xl px-4 text-sm font-bold transition ${category.active ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200'}`}
                        >
                          {category.active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                        </button>
                        <button type="button" onClick={() => removeCategory(category.id)} className="inline-flex h-11 items-center rounded-xl border border-red-100 px-4 text-sm font-bold text-red-600 transition hover:bg-red-50">
                          <Trash2 className="mr-2 h-4 w-4" />
                          মুছুন
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-700">আইটেম তালিকা</h4>
                      <span className="text-[11px] text-gray-400">মোট {category.items.length} টি আইটেম</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {category.items.map((itemName) => (
                        <span key={`${category.id}-${itemName}`} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700">
                          {itemName}
                          <button type="button" onClick={() => removeItemFromCategory(category.id, itemName)} className="text-gray-400 transition hover:text-red-500">×</button>
                        </span>
                      ))}
                      {category.items.length === 0 && (
                        <span className="text-xs italic text-gray-400">এখনও কোনো আইটেম যোগ করা হয়নি</span>
                      )}
                    </div>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={newCategoryItemDrafts[category.id] || ''}
                        onChange={(e) => setNewCategoryItemDrafts((prev) => ({ ...prev, [category.id]: e.target.value }))}
                        placeholder="নতুন আইটেমের নাম"
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400"
                      />
                      <button type="button" onClick={() => addItemToCategory(category.id)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 px-4 py-2 text-sm font-bold text-blue-600 transition hover:bg-blue-50">
                        <PlusCircle className="h-4 w-4" />
                        আইটেম যোগ করুন
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-700">দ্রুত লিংক ম্যানেজমেন্ট</h3>
                <p className="mt-1 text-xs text-gray-500">ড্যাশবোর্ডের shared resource links এখান থেকে নিয়ন্ত্রণ করুন</p>
              </div>
            </div>

            <div className="mb-4 rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-4">
              <div className="grid gap-2">
                <input
                  type="text"
                  value={newQuickLinkTitle}
                  onChange={(e) => setNewQuickLinkTitle(e.target.value)}
                  placeholder="লিংকের শিরোনাম"
                  className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400"
                />
                <input
                  type="text"
                  value={newQuickLinkDescription}
                  onChange={(e) => setNewQuickLinkDescription(e.target.value)}
                  placeholder="সংক্ষিপ্ত বিবরণ"
                  className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400"
                />
                <input
                  type="text"
                  value={newQuickLinkUrl}
                  onChange={(e) => {
                    setNewQuickLinkUrl(e.target.value);
                    setNewQuickLinkResolvedUrl(e.target.value);
                    if (newQuickLinkUploadName) {
                      setNewQuickLinkUploadName('');
                    }
                  }}
                  placeholder="URL বা /telephone-index-2025.pdf এর মতো public path"
                  className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400"
                />
                <input
                  ref={quickLinkFileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  onChange={handleQuickLinkFileUpload}
                  className="hidden"
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => quickLinkFileInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-amber-300 px-4 py-2 text-sm font-bold text-amber-700 transition hover:bg-amber-50"
                  >
                    <Upload className="h-4 w-4" />
                    ফাইল আপলোড করুন
                  </button>
                  <div className="text-xs text-gray-500">
                    সর্বোচ্চ ৫ MB। URL/path না দিয়েও file upload করা যাবে।
                  </div>
                </div>
                {newQuickLinkUploadName && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                    নির্বাচিত ফাইল: {newQuickLinkUploadName}
                  </div>
                )}
                <button type="button" onClick={addQuickLink} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a3a6b] px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-800">
                  <PlusCircle className="h-4 w-4" />
                  নতুন দ্রুত লিংক
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {settings.quickLinks.map((link) => (
                <div key={link.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="grid gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-bold text-gray-500">শিরোনাম</label>
                      <input
                        type="text"
                        value={link.title}
                        onChange={(e) => updateQuickLink(link.id, { title: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-bold text-gray-500">বিবরণ</label>
                      <input
                        type="text"
                        value={link.description}
                        onChange={(e) => updateQuickLink(link.id, { description: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-bold text-gray-500">URL / Public Path</label>
                      <input
                        type="text"
                        value={link.url}
                        onChange={(e) => updateQuickLink(link.id, { url: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button type="button" onClick={() => removeQuickLink(link.id)} className="inline-flex items-center rounded-xl border border-red-100 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50">
                        <Trash2 className="mr-2 h-4 w-4" />
                        মুছুন
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {settings.quickLinks.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-xs text-gray-500">
                  এখনও কোনো দ্রুত লিংক যোগ করা হয়নি।
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-blue-100 bg-gradient-to-b from-blue-50 via-white to-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-blue-500">Live Preview</div>
                <h3 className="mt-2 text-lg font-bold text-[#1a3a6b]">বর্তমান কনফিগারেশন সারাংশ</h3>
              </div>
              <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${settings.maintenanceMode ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {settings.maintenanceMode ? 'Maintenance Mode চালু' : 'System Active'}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-blue-100 bg-white p-4">
                <div className="text-[11px] font-bold text-blue-500">সক্রিয় ক্যাটাগরি</div>
                <div className="mt-1 text-2xl font-extrabold text-[#1a3a6b]">{activeCategories.length}</div>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-white p-4">
                <div className="text-[11px] font-bold text-blue-500">মোট আইটেম</div>
                <div className="mt-1 text-2xl font-extrabold text-[#1a3a6b]">{totalItems}</div>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-white p-4">
                <div className="text-[11px] font-bold text-blue-500">সেবা টাইপ</div>
                <div className="mt-1 text-2xl font-extrabold text-[#1a3a6b]">{settings.requestTypes.length}</div>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-white p-4">
                <div className="text-[11px] font-bold text-blue-500">নোটিফিকেশন</div>
                <div className="mt-1 text-sm font-bold text-[#1a3a6b]">{settings.emailNotifications ? 'চালু' : 'বন্ধ'}</div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-4">
              <h4 className="text-sm font-bold text-gray-800">ফর্ম প্রিভিউ</h4>
              <div className="mt-3 space-y-3">
                {activeCategories.map((category) => (
                  <div key={category.id} className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-gray-800">{category.label}</div>
                        <div className="mt-1 text-[11px] text-gray-500">{officerOptions.find((option) => option.value === category.officerRole)?.label || 'কোন অফিসার নির্ধারিত নেই'}</div>
                      </div>
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold text-blue-700">{category.items.length} টি আইটেম</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {settings.requestTypes.map((typeName) => (
                        <span key={`${category.id}-${typeName}`} className="rounded-full border border-blue-100 bg-white px-2.5 py-1 text-[10px] font-semibold text-blue-700">{typeName}</span>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {category.items.slice(0, 6).map((itemName) => (
                        <span key={`${category.id}-${itemName}-preview`} className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[10px] text-gray-600">{itemName}</span>
                      ))}
                      {category.items.length > 6 && (
                        <span className="rounded-lg border border-dashed border-gray-200 px-2.5 py-1 text-[10px] text-gray-400">আরও {category.items.length - 6} টি</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-6">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-xl bg-[#1a3a6b] px-6 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={saving}
        >
          {saving ? 'সংরক্ষণ করা হচ্ছে...' : 'পরিবর্তন সংরক্ষণ করুন'}
        </button>
      </div>
    </div>
  );
}

interface Division {
  id: number;
  name: string;
  head: string;
  employees: number;
  status: 'Active' | 'Inactive';
}

function DivisionManagement() {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDivisions();
  }, []);

  const fetchDivisions = async () => {
    try {
      const response = await fetch('/api/divisions');
      const data = await response.json();
      setDivisions(data);
    } catch (error) {
      console.error('Error fetching divisions:', error);
    } finally {
      setLoading(false);
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDivision, setEditingDivision] = useState<Division | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    head: '',
    employees: '',
    status: 'Active' as 'Active' | 'Inactive'
  });

  const handleOpenModal = (division?: Division) => {
    if (division) {
      setEditingDivision(division);
      setFormData({
        name: division.name,
        head: division.head,
        employees: division.employees.toString(),
        status: division.status
      });
    } else {
      setEditingDivision(null);
      setFormData({
        name: '',
        head: '',
        employees: '',
        status: 'Active'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDivision(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      head: formData.head,
      employees: parseInt(formData.employees) || 0,
      status: formData.status
    };

    try {
      if (editingDivision) {
        await fetch(`/api/divisions/${editingDivision.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch('/api/divisions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      fetchDivisions();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving division:', error);
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const handleDelete = async () => {
    if (confirmDeleteId) {
      try {
        await fetch(`/api/divisions/${confirmDeleteId}`, { method: 'DELETE' });
        fetchDivisions();
      } catch (error) {
        console.error('Error deleting division:', error);
      } finally {
        setConfirmDeleteId(null);
      }
    }
  };

  const filteredDivisions = divisions.filter((division) =>
    matchesTextQuery(searchTerm, division.name, division.head, `${division.employees}`, division.status)
  );

  if (loading) return <div className="text-center py-10 text-gray-500 text-xs">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-gray-700">বিভাগ তালিকা</h3>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-[#1a3a6b] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-blue-800 transition flex items-center gap-2"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          নতুন বিভাগ যোগ করুন
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
        <label className="mb-1 block text-[11px] font-bold text-gray-500">টেবিল সার্চ</label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="বিভাগ, প্রধান, জনবল বা অবস্থা দিয়ে খুঁজুন"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-blue-400"
        />
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">বিভাগের নাম</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">বিভাগীয় প্রধান</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">জনবল</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">অবস্থা</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredDivisions.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-4 text-xs font-bold text-gray-800">{d.name}</td>
                <td className="px-4 py-4 text-xs text-gray-500">{d.head}</td>
                <td className="px-4 py-4 text-xs text-gray-600">{d.employees} জন</td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-0.5 text-[9px] font-bold text-white rounded-full ${d.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {d.status === 'Active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </span>
                </td>
                <td className="px-4 py-4 text-right space-x-2">
                  <button 
                    onClick={() => handleOpenModal(d)}
                    className="text-blue-600 hover:text-blue-800 p-1 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setConfirmDeleteId(d.id)}
                    className="text-red-600 hover:text-red-800 p-1 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredDivisions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-xs italic">কোন বিভাগ খুঁজে পাওয়া যায়নি</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal 
        isOpen={!!confirmDeleteId} 
        message="আপনি কি নিশ্চিত যে আপনি এই বিভাগটি মুছতে চান?" 
        onConfirm={handleDelete} 
        onCancel={() => setConfirmDeleteId(null)} 
      />

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-[#1a3a6b] px-6 py-4 flex justify-between items-center">
              <h3 className="text-white font-bold text-sm">
                {editingDivision ? 'বিভাগ এডিট করুন' : 'নতুন বিভাগ যোগ করুন'}
              </h3>
              <button onClick={handleCloseModal} className="text-white hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">বিভাগের নাম</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="উদা: আইসিটি বিভাগ"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">বিভাগীয় প্রধান</label>
                <input 
                  type="text" 
                  required
                  value={formData.head}
                  onChange={(e) => setFormData({...formData, head: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="উদা: পরিচালক (আইসিটি)"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">জনবল (সংখ্যা)</label>
                <input 
                  type="number" 
                  required
                  value={formData.employees}
                  onChange={(e) => setFormData({...formData, employees: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="উদা: ২৫"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">অবস্থা</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as 'Active' | 'Inactive'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Active">সক্রিয় (Active)</option>
                  <option value="Inactive">নিষ্ক্রিয় (Inactive)</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 transition"
                >
                  বাতিল
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#1a3a6b] text-white rounded-lg text-sm font-bold hover:bg-blue-800 transition"
                >
                  {editingDivision ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function RoleManagement() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles');
      const data = await response.json();
      setRoles(data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    name_bn: '',
    description: '',
    permissions: [] as string[],
    status: 'Active' as 'Active' | 'Inactive'
  });

  const handleOpenModal = (role?: RoleItem) => {
    if (role) {
      setEditingRole(role);
      let perms: string[] = [];
      try {
        perms = role.permissions ? JSON.parse(role.permissions) : [];
      } catch (e) {
        console.error("Error parsing permissions", e);
      }
      setFormData({
        name: role.name,
        slug: role.slug,
        name_bn: role.name_bn,
        description: role.description || '',
        permissions: perms,
        status: role.status
      });
    } else {
      setEditingRole(null);
      setFormData({
        name: '',
        slug: '',
        name_bn: '',
        description: '',
        permissions: [],
        status: 'Active'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRole(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      slug: formData.slug,
      name_bn: formData.name_bn,
      description: formData.description,
      permissions: JSON.stringify(formData.permissions),
      status: formData.status
    };

    try {
      if (editingRole) {
        await fetch(`/api/roles/${editingRole.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch('/api/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      fetchRoles();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving role:', error);
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const handleDelete = async () => {
    if (confirmDeleteId) {
      try {
        await fetch(`/api/roles/${confirmDeleteId}`, { method: 'DELETE' });
        fetchRoles();
      } catch (error) {
        console.error('Error deleting role:', error);
      } finally {
        setConfirmDeleteId(null);
      }
    }
  };

  const filteredRoles = roles.filter((role) =>
    matchesTextQuery(searchTerm, role.name, role.slug, role.name_bn, role.description, role.status)
  );

  if (loading) return <div className="text-center py-10 text-gray-500 text-xs">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-gray-700">রোল তালিকা</h3>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-[#1a3a6b] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-blue-800 transition flex items-center gap-2"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          নতুন রোল যোগ করুন
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
        <label className="mb-1 block text-[11px] font-bold text-gray-500">টেবিল সার্চ</label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="রোল, স্লাগ, বাংলা নাম বা অবস্থা দিয়ে খুঁজুন"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-blue-400"
        />
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">রোলের নাম (EN)</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">সিস্টেম স্ল্যাগ (Slug)</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">রোলের নাম (BN)</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">বিবরণ</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">অবস্থা</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredRoles.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-4 text-xs font-bold text-gray-800">{r.name}</td>
                <td className="px-4 py-4 text-xs font-mono text-blue-600">{r.slug}</td>
                <td className="px-4 py-4 text-xs text-gray-500">{r.name_bn}</td>
                <td className="px-4 py-4 text-xs text-gray-600">{r.description}</td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-0.5 text-[9px] font-bold text-white rounded-full ${r.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {r.status === 'Active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-center gap-2">
                  <button 
                    onClick={() => handleOpenModal(r)}
                    className="text-blue-600 hover:text-blue-800 p-1 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setConfirmDeleteId(r.id)}
                    className="text-red-600 hover:text-red-800 p-1 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredRoles.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-xs italic">কোন রোল খুঁজে পাওয়া যায়নি</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal 
        isOpen={!!confirmDeleteId} 
        message="আপনি কি নিশ্চিত যে আপনি এই রোলটি মুছতে চান?" 
        onConfirm={handleDelete} 
        onCancel={() => setConfirmDeleteId(null)} 
      />

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-[#1a3a6b] px-6 py-4 flex justify-between items-center shrink-0">
              <h3 className="text-white font-bold text-sm">
                {editingRole ? 'রোল এডিট করুন' : 'নতুন রোল যোগ করুন'}
              </h3>
              <button onClick={handleCloseModal} className="text-white hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">রোলের নাম (English)</label>
                    <input 
                      type="text" 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="উদা: Admin"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">সিস্টেম স্ল্যাগ (System Slug)</label>
                    <input 
                      type="text" 
                      required
                      value={formData.slug}
                      onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '_')})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="উদা: admin, desk_officer_hardware"
                    />
                    <p className="text-[9px] text-gray-400 mt-1">* এটি সিস্টেমের অভ্যন্তরীণ কাজের জন্য ব্যবহৃত হয়। পরিবর্তন করার সময় সতর্ক থাকুন।</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">রোলের নাম (বাংলা)</label>
                    <input 
                      type="text" 
                      required
                      value={formData.name_bn}
                      onChange={(e) => setFormData({...formData, name_bn: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="উদা: অ্যাডমিন"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">বিবরণ</label>
                    <textarea 
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]"
                      placeholder="রোলের সংক্ষিপ্ত বিবরণ..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">অবস্থা</label>
                    <select 
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as 'Active' | 'Inactive'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="Active">সক্রিয় (Active)</option>
                      <option value="Inactive">নিষ্ক্রিয় (Inactive)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700 mb-2">ফিচার অ্যাসাইন করুন (Assign Features)</label>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 space-y-2 max-h-[300px] overflow-y-auto">
                    {AVAILABLE_FEATURES.map(feature => (
                      <label key={feature.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-md cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                        <input 
                          type="checkbox"
                          checked={formData.permissions.includes(feature.id)}
                          onChange={(e) => {
                            const newPerms = e.target.checked 
                              ? [...formData.permissions, feature.id]
                              : formData.permissions.filter(p => p !== feature.id);
                            setFormData({...formData, permissions: newPerms});
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-700 font-medium">{feature.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 transition"
                >
                  বাতিল
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#1a3a6b] text-white rounded-lg text-sm font-bold hover:bg-blue-800 transition"
                >
                  {editingRole ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function UserReport({ email, onClose }: { email: string, onClose: () => void }) {
  const systemSettings = useSystemSettings();
  const activeManagedCategories = getActiveManagedCategories(systemSettings);
  const categoryLabelMap = activeManagedCategories.reduce<Record<string, string>>((acc, category) => {
    acc[category.key] = category.label || category.key;
    return acc;
  }, {});
  const [userData, setUserData] = useState<UserListItem | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, appsRes] = await Promise.all([
          fetch('/api/users'),
          fetch(`/api/applications?email=${encodeURIComponent(email)}`)
        ]);
        const usersData = await usersRes.json();
        const appsData = await appsRes.json();
        const matchedUser = Array.isArray(usersData)
          ? usersData.find((user: UserListItem) => user.email === email) || null
          : null;
        setUserData(matchedUser);
        setApplications(appsData);
      } catch (error) {
        console.error('Error fetching report data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [email]);

  const filteredApplications = applications.filter((app) => {
    const submittedAt = parseSubmissionDate(app.submission_date);
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo) : null;

    if (fromDate && submittedAt && submittedAt < fromDate) return false;
    if (toDate && submittedAt) {
      const inclusiveToDate = new Date(toDate);
      inclusiveToDate.setHours(23, 59, 59, 999);
      if (submittedAt > inclusiveToDate) return false;
    }

    if (serviceFilter && !`${app.service_type ?? ''}`.includes(serviceFilter)) return false;

    if (statusFilter) {
      const appStatusLabel = STATUS_CONFIG[app.status]?.label || app.status;
      const selectedStatusLabel = STATUS_CONFIG[statusFilter]?.label || statusFilter;
      if (appStatusLabel !== selectedStatusLabel) return false;
    }

    return true;
  });

  const reportStats = {
    total: filteredApplications.length,
    completed: filteredApplications.filter((app) => app.status === 'Done').length,
    rejected: filteredApplications.filter((app) => app.status === 'Rejected by Divisional Head').length,
    active: filteredApplications.filter((app) => !['Done', 'Rejected by Divisional Head'].includes(app.status)).length
  };

  const handlePrint = () => {
    const reportWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!reportWindow) return;

    const activeServiceLabel = serviceFilter ? (categoryLabelMap[serviceFilter] || serviceFilter) : 'সকল';
    const activeStatusLabel = statusFilter ? (STATUS_CONFIG[statusFilter]?.label || statusFilter) : 'সকল';
    const activeDateLabel = dateFrom || dateTo ? `${dateFrom || 'শুরু নেই'} - ${dateTo || 'শেষ নেই'}` : 'সকল সময়';
    const rows = filteredApplications.length > 0
      ? filteredApplications.map((app, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(app.tracking_no || '')}</td>
            <td>${escapeHtml(app.submission_date || '')}</td>
            <td>${escapeHtml(app.service_type || '')}</td>
            <td>${escapeHtml(STATUS_CONFIG[app.status]?.label || app.status || '')}</td>
          </tr>
        `).join('')
      : `<tr><td colspan="5" class="empty-row">নির্বাচিত ফিল্টারে কোনো আবেদন পাওয়া যায়নি</td></tr>`;

    const content = `
      <!DOCTYPE html>
      <html lang="bn">
        <head>
          <meta charset="UTF-8" />
          <title>ইউজার রিপোর্ট - ${escapeHtml(userData?.name_bn || userData?.name || email)}</title>
          <style>
            @page { size: A4 portrait; margin: 16mm; }
            * { box-sizing: border-box; }
            body { font-family: 'Noto Sans Bengali', Arial, sans-serif; color: #1f2937; margin: 0; font-size: 12px; }
            .sheet { width: 100%; }
            .header { border-bottom: 2px solid #1a3a6b; padding-bottom: 12px; margin-bottom: 18px; text-align: center; }
            .header h1 { margin: 0 0 4px; font-size: 24px; color: #1a3a6b; }
            .header p { margin: 0; color: #475569; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; margin-bottom: 16px; border: 1px solid #dbe3ef; border-radius: 10px; padding: 14px; background: #f8fafc; }
            .meta-item strong { color: #475569; display: inline-block; min-width: 72px; }
            .filter-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
            .filter-card, .stat-card { border: 1px solid #dbe3ef; border-radius: 10px; padding: 12px; background: #fff; }
            .filter-label, .stat-label { font-size: 11px; color: #64748b; font-weight: 700; margin-bottom: 4px; }
            .filter-value { font-weight: 700; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; }
            .stat-value { font-size: 22px; font-weight: 800; color: #1a3a6b; }
            h3 { margin: 0 0 10px; font-size: 15px; color: #1f2937; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #dbe3ef; padding: 8px 10px; text-align: left; vertical-align: top; }
            th { background: #eff6ff; color: #334155; font-weight: 700; }
            .empty-row { text-align: center; color: #64748b; font-style: italic; }
            .footer { margin-top: 18px; text-align: right; font-size: 10px; color: #64748b; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="header">
              <h1>ব্যক্তিগত সেবা রিপোর্ট</h1>
              <p>বাংলাদেশ বিশ্ববিদ্যালয় মঞ্জুরী কমিশন</p>
            </div>
            <div class="meta-grid">
              <div class="meta-item"><strong>নাম:</strong> ${escapeHtml(userData?.name_bn || userData?.name || 'প্রযোজ্য নয়')}</div>
              <div class="meta-item"><strong>ইমেইল:</strong> ${escapeHtml(email)}</div>
              <div class="meta-item"><strong>পদবী:</strong> ${escapeHtml(userData?.designation || 'প্রযোজ্য নয়')}</div>
              <div class="meta-item"><strong>বিভাগ:</strong> ${escapeHtml(userData?.division || 'প্রযোজ্য নয়')}</div>
            </div>
            <div class="filter-grid">
              <div class="filter-card">
                <div class="filter-label">তারিখ সীমা</div>
                <div class="filter-value">${escapeHtml(activeDateLabel)}</div>
              </div>
              <div class="filter-card">
                <div class="filter-label">সেবার ধরন</div>
                <div class="filter-value">${escapeHtml(activeServiceLabel)}</div>
              </div>
              <div class="filter-card">
                <div class="filter-label">অবস্থা</div>
                <div class="filter-value">${escapeHtml(activeStatusLabel)}</div>
              </div>
            </div>
            <div class="stats-grid">
              <div class="stat-card"><div class="stat-label">মোট আবেদন</div><div class="stat-value">${reportStats.total}</div></div>
              <div class="stat-card"><div class="stat-label">প্রক্রিয়াধীন</div><div class="stat-value">${reportStats.active}</div></div>
              <div class="stat-card"><div class="stat-label">সম্পন্ন</div><div class="stat-value">${reportStats.completed}</div></div>
              <div class="stat-card"><div class="stat-label">বাতিল</div><div class="stat-value">${reportStats.rejected}</div></div>
            </div>
            <h3>আবেদনের তালিকা</h3>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>ট্র্যাকিং নং</th>
                  <th>তারিখ</th>
                  <th>সেবার ধরন</th>
                  <th>অবস্থা</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <div class="footer">
              রিপোর্ট তৈরির তারিখ: ${escapeHtml(new Date().toLocaleString('bn-BD'))}
            </div>
          </div>
        </body>
      </html>
    `;

    reportWindow.document.write(content);
    reportWindow.document.close();
    setTimeout(() => reportWindow.print(), 500);
  };

  if (loading) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[150] p-4 font-['Noto_Sans_Bengali']">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#1a3a6b] px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="text-white w-5 h-5" />
            <h3 className="text-white font-bold text-sm">ইউজার রিপোর্ট: {userData?.name_bn || userData?.name || email}</h3>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/10 p-1 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8">
          <div className="flex flex-col md:flex-row gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-inner border border-gray-200 overflow-hidden shrink-0">
              <User className="w-12 h-12 text-gray-300" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 flex-1">
              <div>
                <p className="text-[10px] font-bold text-gray-400 mb-1">নাম</p>
                <p className="text-sm font-bold text-gray-800">{userData?.name_bn || userData?.name || 'প্রযোজ্য নয়'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 mb-1">ইমেইল</p>
                <p className="text-sm text-gray-600 font-mono">{email}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 mb-1">পদবী</p>
                <p className="text-sm text-gray-800">{userData?.designation || 'প্রযোজ্য নয়'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 mb-1">বিভাগ</p>
                <p className="text-sm text-gray-800">{userData?.division || 'প্রযোজ্য নয়'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-1 block text-[11px] font-bold text-gray-500">শুরুর তারিখ</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-gray-500">শেষের তারিখ</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-gray-500">সেবার ধরন</label>
                <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400">
                  <option value="">সকল</option>
                  {SERVICE_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-gray-500">অবস্থা</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400">
                  <option value="">সকল</option>
                  {REPORT_STATUS_OPTIONS.map((item) => <option key={item} value={item}>{STATUS_CONFIG[item]?.label || item}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                  setServiceFilter('');
                  setStatusFilter('');
                }}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-100"
              >
                রিসেট
              </button>
              <button onClick={handlePrint} className="inline-flex items-center gap-2 rounded-xl bg-[#1a3a6b] px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-800">
                <Printer className="h-4 w-4" />
                রিপোর্ট / প্রিন্ট
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <UserReportStatCard label="মোট আবেদন" value={reportStats.total} color="blue" />
            <UserReportStatCard label="প্রক্রিয়াধীন" value={reportStats.active} color="yellow" />
            <UserReportStatCard label="সম্পন্ন" value={reportStats.completed} color="green" />
            <UserReportStatCard label="বাতিল" value={reportStats.rejected} color="red" />
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-800 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-gray-400" />
              ফিল্টারকৃত আবেদনসমূহ
            </h4>
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-center text-[10px] font-bold text-gray-400 uppercase">ট্র্যাকিং নং</th>
                    <th className="px-4 py-2 text-center text-[10px] font-bold text-gray-400 uppercase">তারিখ</th>
                    <th className="px-4 py-2 text-center text-[10px] font-bold text-gray-400 uppercase">সেবা</th>
                    <th className="px-4 py-2 text-center text-[10px] font-bold text-gray-400 uppercase">অবস্থা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredApplications.map((app) => (
                    <tr key={app.id}>
                      <td className="px-4 py-3 text-[11px] font-mono text-blue-600">{app.tracking_no}</td>
                      <td className="px-4 py-3 text-[11px] text-gray-500">{app.submission_date}</td>
                      <td className="px-4 py-3 text-[11px] text-gray-700">{app.service_type}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold text-white ${STATUS_CONFIG[app.status]?.color || 'bg-gray-400'}`}>
                          {STATUS_CONFIG[app.status]?.label || app.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredApplications.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-xs text-gray-400 italic">নির্বাচিত ফিল্টারে কোনো আবেদন পাওয়া যায়নি</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-100 transition">
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
}

function UserReportStatCard({ label, value, color }: { label: string, value: number, color: 'blue' | 'green' | 'yellow' | 'red' }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    red: 'bg-red-50 text-red-700 border-red-100'
  };

  return (
    <div className={`p-4 rounded-2xl border ${colors[color]} flex flex-col items-center justify-center gap-1`}>
      <span className="text-2xl font-black">{value || 0}</span>
      <span className="text-[10px] font-bold opacity-70">{label}</span>
    </div>
  );
}

