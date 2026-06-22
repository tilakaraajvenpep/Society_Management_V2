import { createContext, useContext, useState } from 'react';

export type Language = 'en' | 'ta';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Nav - Tenant Admin
    'nav.overview': 'Overview',
    'nav.members': 'Members',
    'nav.payments': 'Payments',
    'nav.ledger': 'Ledger Dates',
    'nav.upcoming': 'Upcoming Dues',
    'nav.expenses': 'Expenses',
    'nav.helpdesk': 'Helpdesk',
    'nav.vendors': 'Vendors',
    'nav.events': 'Society Events',
    'nav.notifications': 'Raise Notifications',
    'nav.settings': 'Settings',
    'nav.staff': 'Office Bearers',
    'nav.logs': 'Audit Logs',
    'nav.reports': 'Reports',
    // Nav - Member
    'nav.home': 'My Home',
    'nav.dues_history': 'Maintenance Fee History',
    'nav.payment_history': 'Payment History',
    'nav.receipts': 'Receipts',
    'nav.my_profile': 'My Profile',
    // Header - Tenant Admin
    'header.admin_dashboard': 'Admin Dashboard',
    'header.treasurer_dashboard': 'Treasurer Dashboard',
    'header.society_dashboard': 'Society Dashboard',
    'header.welcome': 'Welcome',
    'header.transfer_cash': 'Transfer Cash',
    'header.record_payment': 'Record Payment',
    'header.logout': 'Logout',
    'header.edit': 'Edit',
    // Header - Member
    'header.resident_portal': 'Resident Portal',
    // Language
    'lang.select': 'Language',
    'lang.en': 'English',
    'lang.ta': 'Tamil',
    // Common actions
    'action.save': 'Save',
    'action.cancel': 'Cancel',
    'action.edit': 'Edit',
    'action.delete': 'Delete',
    'action.add': 'Add',
    'action.update': 'Update',
    'action.search': 'Search',
    'action.download': 'Download',
    'action.export': 'Export Excel',
    'action.print': 'Print',
    'action.close': 'Close',
    'action.submit': 'Submit',
    'action.view': 'View',
    'action.remove': 'Remove',
    'action.send': 'Send',
    'action.loading': 'Loading...',
    'action.saving': 'Saving...',
    // Members
    'members.title': 'Members',
    'members.add': 'Add Member',
    'members.add_new': 'Add New Member',
    'members.flat_no': 'Flat / Unit No',
    'members.name': 'Name',
    'members.mobile': 'Mobile',
    'members.email': 'Email',
    'members.paid_until': 'Paid Until',
    'members.outstanding_dues': 'Outstanding Dues',
    'members.status': 'Status',
    'members.actions': 'Actions',
    'members.no_record': 'No Record',
    'members.search': 'Search members...',
    'members.residence_type': 'Residence Type',
    'members.full_name': 'Full Name',
    'members.password': 'Password',
    'members.update': 'Update Member',
    // Payments
    'payments.title': 'Payments',
    'payments.record': 'Record Payment',
    'payments.history': 'Payment History',
    'payments.receipt': 'Payment Receipt',
    'payments.receipt_no': 'Receipt Number',
    'payments.period': 'Payment Period',
    'payments.mode': 'Payment Mode',
    'payments.base_amount': 'Base Amount',
    'payments.late_fee': 'Late Fee',
    'payments.total': 'Total Amount',
    'payments.early_discount': 'Early Bird Discount',
    'payments.date': 'Date',
    'payments.no_records': 'No payment records found.',
    'payments.member': 'Member',
    'payments.amount': 'Amount',
    'payments.received_from': 'Received From',
    'payments.category': 'Category',
    // Expenses
    'expenses.title': 'Expense Ledger',
    'expenses.add': 'Add Expense',
    'expenses.no_records': 'No expenses recorded yet.',
    'expenses.category': 'Category',
    'expenses.vendor': 'Vendor',
    'expenses.recurring': 'Recurring',
    // Vendors
    'vendors.title': 'Vendors & Service Providers',
    'vendors.add': 'Add Vendor',
    'vendors.name': 'Vendor / Company Name',
    'vendors.service_type': 'Service Type',
    'vendors.phone': 'Phone / Mobile',
    'vendors.notes': 'Notes',
    // Staff
    'staff.title': 'Office Bearers & Staff',
    'staff.add': 'Add Office Bearer',
    'staff.designation': 'Designation',
    // Overview / Dashboard
    'overview.total_income': 'Total Income',
    'overview.total_expenses': 'Total Expenses',
    'overview.net_balance': 'Net Balance',
    'overview.total_members': 'Total Members',
    'overview.members_with_dues': 'Members with Dues',
    'overview.cash_in_hand': 'Cash in Hand',
    'overview.this_month': 'This Month',
    'overview.recent_payments': 'Recent Payments',
    // Member portal overview
    'member.hello': 'Hello',
    'member.welcome': 'Welcome to your resident portal for',
    'member.current_dues': 'Current Dues',
    'member.due_months': 'Due Months',
    'member.flat_details': 'Flat Details',
    'member.annual_cost': 'Annual Maintenance Cost',
    'member.no_dues': 'No outstanding dues!',
    'member.pay_online': 'pay online now',
    'member.all_paid': 'All months paid!',
    'member.unit': 'Unit',
    'member.pending_months': 'month(s) pending payment',
    'member.no_pending': 'No pending months',
    'member.flat': 'Flat',
    // Profile
    'profile.edit': 'Edit Profile',
    'profile.full_name': 'Full Name',
    'profile.flat_no': 'Flat Number',
    'profile.billing_cycle': 'Billing Cycle',
    'profile.address': 'Address',
    'profile.phone': 'Phone Number',
    'profile.new_password': 'New Password',
    'profile.confirm_password': 'Confirm New Password',
    'profile.save_changes': 'Save Changes',
    'profile.security': 'Security & Contact Info',
    'profile.leave_blank': 'Leave blank to keep current password',
    'profile.change_photo': 'Change Photo',
    'profile.upload_photo': 'Upload Photo',
    // Helpdesk
    'helpdesk.my_tickets': 'My Tickets',
    'helpdesk.new_ticket': 'New Ticket',
    'helpdesk.raise_ticket': 'Raise New Ticket',
    'helpdesk.subject': 'Subject',
    'helpdesk.description': 'Description',
    'helpdesk.priority': 'Priority',
    'helpdesk.submit': 'Submit Ticket',
    'helpdesk.add_reply': 'Add a reply...',
    'helpdesk.select_ticket': 'Select a ticket to view conversation',
    'helpdesk.no_tickets': 'No tickets raised yet.',
    'helpdesk.attachment': 'Attachment (Optional Image)',
    // Settings
    'settings.title': 'Settings',
    'settings.pricing': 'Pricing',
    'settings.reminders': 'Reminders',
    'settings.general': 'General',
    // Status
    'status.paid': 'Paid',
    'status.overdue': 'Overdue',
    'status.due_this_month': 'Due This Month',
    'status.cancelled': 'Cancelled',
    'status.open': 'Open',
    'status.resolved': 'Resolved',
    'status.closed': 'Closed',
    // Events
    'events.title': 'Society Events',
    'events.no_events': 'No upcoming events.',
    // Reports
    'reports.title': 'Financial Reports',
    'reports.export': 'Export as Excel',
    'reports.apply_filter': 'Apply Filter',
    'reports.period_income': 'Period Income',
    'reports.period_expenses': 'Period Expenses',
    // Upcoming dues
    'upcoming.title': 'Upcoming Dues',
    'upcoming.member': 'Member',
    'upcoming.paid_until': 'Paid Until',
    'upcoming.outstanding': 'Outstanding Dues',
    'upcoming.no_records': 'No upcoming or overdue payments! All members are paid up.',
    // Audit logs
    'logs.title': 'Audit Logs',
    // Notifications
    'notify.title': 'Send Notification',
    'notify.send': 'Send to Member',
    'notify.broadcast': 'Broadcast Notification',
    // Cash handover
    'cash.handover_request': 'Cash Handover Request',
    'cash.accept': 'Accept & Update Balance',
    'cash.wants_handover': 'wants to handover',
    'cash.to_you': 'to you.',
    // Ledger
    'ledger.title': 'Ledger Payment Dates',
  },

  ta: {
    // Nav - Tenant Admin
    'nav.overview': 'மேலோட்டம்',
    'nav.members': 'உறுப்பினர்கள்',
    'nav.payments': 'கட்டணங்கள்',
    'nav.ledger': 'பேரேடு தேதிகள்',
    'nav.upcoming': 'வரவிருக்கும் நிலுவைகள்',
    'nav.expenses': 'செலவுகள்',
    'nav.helpdesk': 'உதவி மேசை',
    'nav.vendors': 'சேவையாளர்கள்',
    'nav.events': 'சமூக நிகழ்வுகள்',
    'nav.notifications': 'அறிவிப்புகள் அனுப்பு',
    'nav.settings': 'அமைப்புகள்',
    'nav.staff': 'அலுவல் பொறுப்பாளர்கள்',
    'nav.logs': 'தணிக்கை பதிவுகள்',
    'nav.reports': 'அறிக்கைகள்',
    // Nav - Member
    'nav.home': 'என் முகப்பு',
    'nav.dues_history': 'பராமரிப்பு கட்டண வரலாறு',
    'nav.payment_history': 'கட்டண வரலாறு',
    'nav.receipts': 'ரசீதுகள்',
    'nav.my_profile': 'என் சுயவிவரம்',
    // Header - Tenant Admin
    'header.admin_dashboard': 'நிர்வாக டாஷ்போர்டு',
    'header.treasurer_dashboard': 'கருவூலர் டாஷ்போர்டு',
    'header.society_dashboard': 'சமூக டாஷ்போர்டு',
    'header.welcome': 'வணக்கம்',
    'header.transfer_cash': 'பணம் மாற்று',
    'header.record_payment': 'கட்டணம் பதிவு செய்',
    'header.logout': 'வெளியேறு',
    'header.edit': 'திருத்து',
    // Header - Member
    'header.resident_portal': 'குடியிருப்பாளர் போர்டல்',
    // Language
    'lang.select': 'மொழி',
    'lang.en': 'ஆங்கிலம்',
    'lang.ta': 'தமிழ்',
    // Common actions
    'action.save': 'சேமி',
    'action.cancel': 'ரத்துசெய்',
    'action.edit': 'திருத்து',
    'action.delete': 'நீக்கு',
    'action.add': 'சேர்',
    'action.update': 'புதுப்பி',
    'action.search': 'தேடு',
    'action.download': 'பதிவிறக்கு',
    'action.export': 'எக்செல் ஏற்றுமதி',
    'action.print': 'அச்சிடு',
    'action.close': 'மூடு',
    'action.submit': 'சமர்ப்பி',
    'action.view': 'பார்',
    'action.remove': 'நீக்கு',
    'action.send': 'அனுப்பு',
    'action.loading': 'ஏற்றுகிறது...',
    'action.saving': 'சேமிக்கிறது...',
    // Members
    'members.title': 'உறுப்பினர்கள்',
    'members.add': 'உறுப்பினர் சேர்',
    'members.add_new': 'புதிய உறுப்பினர் சேர்',
    'members.flat_no': 'வீடு / அலகு எண்',
    'members.name': 'பெயர்',
    'members.mobile': 'கைபேசி',
    'members.email': 'மின்னஞ்சல்',
    'members.paid_until': 'வரை செலுத்தப்பட்டது',
    'members.outstanding_dues': 'நிலுவை தொகை',
    'members.status': 'நிலை',
    'members.actions': 'செயல்கள்',
    'members.no_record': 'பதிவு இல்லை',
    'members.search': 'உறுப்பினர்களை தேடு...',
    'members.residence_type': 'வாழ்விட வகை',
    'members.full_name': 'முழு பெயர்',
    'members.password': 'கடவுச்சொல்',
    'members.update': 'உறுப்பினர் புதுப்பி',
    // Payments
    'payments.title': 'கட்டணங்கள்',
    'payments.record': 'கட்டணம் பதிவு செய்',
    'payments.history': 'கட்டண வரலாறு',
    'payments.receipt': 'கட்டண ரசீது',
    'payments.receipt_no': 'ரசீது எண்',
    'payments.period': 'கட்டண காலம்',
    'payments.mode': 'கட்டண முறை',
    'payments.base_amount': 'அடிப்படை தொகை',
    'payments.late_fee': 'தாமத கட்டணம்',
    'payments.total': 'மொத்த தொகை',
    'payments.early_discount': 'முன்கூட்டிய தள்ளுபடி',
    'payments.date': 'தேதி',
    'payments.no_records': 'கட்டண பதிவுகள் எதுவும் இல்லை.',
    'payments.member': 'உறுப்பினர்',
    'payments.amount': 'தொகை',
    'payments.received_from': 'பெறப்பட்டது',
    'payments.category': 'வகை',
    // Expenses
    'expenses.title': 'செலவு பதிவேடு',
    'expenses.add': 'செலவு சேர்',
    'expenses.no_records': 'இதுவரை செலவுகள் பதிவு இல்லை.',
    'expenses.category': 'வகை',
    'expenses.vendor': 'சேவையாளர்',
    'expenses.recurring': 'தொடர்ச்சியான',
    // Vendors
    'vendors.title': 'சேவையாளர்கள்',
    'vendors.add': 'சேவையாளர் சேர்',
    'vendors.name': 'சேவையாளர் / நிறுவன பெயர்',
    'vendors.service_type': 'சேவை வகை',
    'vendors.phone': 'தொலைபேசி / கைபேசி',
    'vendors.notes': 'குறிப்புகள்',
    // Staff
    'staff.title': 'அலுவல் பொறுப்பாளர்கள்',
    'staff.add': 'பொறுப்பாளர் சேர்',
    'staff.designation': 'பதவி',
    // Overview
    'overview.total_income': 'மொத்த வருமானம்',
    'overview.total_expenses': 'மொத்த செலவு',
    'overview.net_balance': 'நிகர இருப்பு',
    'overview.total_members': 'மொத்த உறுப்பினர்கள்',
    'overview.members_with_dues': 'நிலுவை உள்ள உறுப்பினர்கள்',
    'overview.cash_in_hand': 'கையிருப்பு பணம்',
    'overview.this_month': 'இந்த மாதம்',
    'overview.recent_payments': 'சமீபத்திய கட்டணங்கள்',
    // Member portal
    'member.hello': 'வணக்கம்',
    'member.welcome': 'உங்கள் குடியிருப்பு போர்டலுக்கு வரவேற்கிறோம்',
    'member.current_dues': 'தற்போதைய நிலுவை',
    'member.due_months': 'நிலுவை மாதங்கள்',
    'member.flat_details': 'வீடு விவரங்கள்',
    'member.annual_cost': 'ஆண்டு பராமரிப்பு செலவு',
    'member.no_dues': 'நிலுவைகள் எதுவும் இல்லை!',
    'member.pay_online': 'இப்போது ஆன்லைனில் செலுத்துங்கள்',
    'member.all_paid': 'அனைத்து மாதங்களும் செலுத்தப்பட்டது!',
    'member.unit': 'அலகு',
    'member.pending_months': 'மாதங்கள் நிலுவையில் உள்ளன',
    'member.no_pending': 'நிலுவை மாதங்கள் இல்லை',
    'member.flat': 'வீடு',
    // Profile
    'profile.edit': 'சுயவிவரம் திருத்து',
    'profile.full_name': 'முழு பெயர்',
    'profile.flat_no': 'வீட்டு எண்',
    'profile.billing_cycle': 'கட்டண சுழற்சி',
    'profile.address': 'முகவரி',
    'profile.phone': 'தொலைபேசி எண்',
    'profile.new_password': 'புதிய கடவுச்சொல்',
    'profile.confirm_password': 'கடவுச்சொல் உறுதிப்படுத்து',
    'profile.save_changes': 'மாற்றங்களை சேமி',
    'profile.security': 'பாதுகாப்பு & தொடர்பு தகவல்',
    'profile.leave_blank': 'தற்போதைய கடவுச்சொல் மாற்றாமல் விட வேண்டுமெனில் காலியாக விடுங்கள்',
    'profile.change_photo': 'புகைப்படம் மாற்று',
    'profile.upload_photo': 'புகைப்படம் பதிவேற்று',
    // Helpdesk
    'helpdesk.my_tickets': 'என் புகார்கள்',
    'helpdesk.new_ticket': 'புதிய புகார்',
    'helpdesk.raise_ticket': 'புதிய புகார் பதிவு',
    'helpdesk.subject': 'தலைப்பு',
    'helpdesk.description': 'விவரம்',
    'helpdesk.priority': 'முன்னுரிமை',
    'helpdesk.submit': 'புகார் சமர்ப்பி',
    'helpdesk.add_reply': 'பதில் சேர்க்கவும்...',
    'helpdesk.select_ticket': 'உரையாடலை பார்க்க புகாரை தேர்ந்தெடுக்கவும்',
    'helpdesk.no_tickets': 'இதுவரை புகார் பதிவு இல்லை.',
    'helpdesk.attachment': 'இணைப்பு (விரும்பினால் படம்)',
    // Settings
    'settings.title': 'அமைப்புகள்',
    'settings.pricing': 'கட்டண விகிதம்',
    'settings.reminders': 'நினைவூட்டல்கள்',
    'settings.general': 'பொது',
    // Status
    'status.paid': 'செலுத்தப்பட்டது',
    'status.overdue': 'தாமதம்',
    'status.due_this_month': 'இந்த மாதம் நிலுவை',
    'status.cancelled': 'ரத்து செய்யப்பட்டது',
    'status.open': 'திறந்தது',
    'status.resolved': 'தீர்க்கப்பட்டது',
    'status.closed': 'மூடப்பட்டது',
    // Events
    'events.title': 'சமூக நிகழ்வுகள்',
    'events.no_events': 'வரவிருக்கும் நிகழ்வுகள் இல்லை.',
    // Reports
    'reports.title': 'நிதி அறிக்கைகள்',
    'reports.export': 'எக்செல் ஏற்றுமதி',
    'reports.apply_filter': 'வடிகட்டு பயன்படுத்து',
    'reports.period_income': 'காலகட்ட வருமானம்',
    'reports.period_expenses': 'காலகட்ட செலவு',
    // Upcoming dues
    'upcoming.title': 'வரவிருக்கும் நிலுவைகள்',
    'upcoming.member': 'உறுப்பினர்',
    'upcoming.paid_until': 'வரை செலுத்தப்பட்டது',
    'upcoming.outstanding': 'நிலுவை தொகை',
    'upcoming.no_records': 'வரவிருக்கும் அல்லது தாமதமான கட்டணங்கள் இல்லை! அனைத்து உறுப்பினர்களும் செலுத்தியுள்ளனர்.',
    // Audit logs
    'logs.title': 'தணிக்கை பதிவுகள்',
    // Notifications
    'notify.title': 'அறிவிப்பு அனுப்பு',
    'notify.send': 'உறுப்பினருக்கு அனுப்பு',
    'notify.broadcast': 'அனைவருக்கும் அனுப்பு',
    // Cash handover
    'cash.handover_request': 'பணம் கையளிப்பு கோரிக்கை',
    'cash.accept': 'ஏற்று & இருப்பு புதுப்பி',
    'cash.wants_handover': 'கையளிக்க விரும்புகிறார்',
    'cash.to_you': 'உங்களுக்கு.',
    // Ledger
    'ledger.title': 'பேரேடு கட்டண தேதிகள்',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language') as Language | null;
    return saved === 'en' || saved === 'ta' ? saved : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  const t = (key: string): string =>
    translations[language][key] ?? translations['en'][key] ?? key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
