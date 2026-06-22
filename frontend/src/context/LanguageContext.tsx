import { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ta';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Common
    'logout': 'Logout',
    'welcome': 'Welcome',
    'loading': 'Loading...',
    'save': 'Save',
    'cancel': 'Cancel',
    'edit': 'Edit',
    'delete': 'Delete',
    'add': 'Add',
    'search': 'Search',
    'actions': 'Actions',
    'status': 'Status',
    'name': 'Name',
    'email': 'Email',
    'mobile': 'Mobile',
    'date': 'Date',
    'amount': 'Amount',
    'notes': 'Notes',
    'yes': 'Yes',
    'no': 'No',
    'close': 'Close',
    'submit': 'Submit',
    'update': 'Update',
    'view': 'View',
    'print': 'Print',
    'download': 'Download',
    'language': 'Language',
    'language.english': 'English',
    'language.tamil': 'Tamil',

    // Navigation — Tenant Admin
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

    // Navigation — Member
    'nav.home': 'My Home',
    'nav.dues_history': 'Maintenance Fee History',
    'nav.payment_history': 'Payment History',
    'nav.receipts': 'Receipts',
    'nav.society_events': 'Society Events',
    'nav.my_profile': 'My Profile',

    // Tenant Admin Header
    'header.admin_dashboard': 'Admin Dashboard',
    'header.treasurer_dashboard': 'Treasurer Dashboard',
    'header.society_dashboard': 'Society Dashboard',
    'header.transfer_cash': 'Transfer Cash',
    'header.record_payment': 'Record Payment',

    // Member Portal
    'member.portal_title': 'Resident Portal',
    'member.hello': 'Hello',
    'member.welcome_msg': 'Welcome to your resident portal for',
    'member.current_dues': 'Current Dues',
    'member.due_months': 'Due Months',
    'member.flat_details': 'Flat Details',
    'member.annual_maintenance': 'Annual Maintenance Cost',
    'member.no_dues': 'No outstanding dues!',
    'member.pay_online': 'pay online now',
    'member.all_paid': 'All months paid!',
    'member.unit': 'Unit',
    'member.flat': 'Flat',

    // Payments
    'payment.history': 'Payment History',
    'payment.receipt': 'Payment Receipt',
    'payment.period': 'Payment Period',
    'payment.mode': 'Payment Mode',
    'payment.base_amount': 'Base Amount',
    'payment.late_fee': 'Late Fee',
    'payment.total': 'Total Amount',
    'payment.early_bird': 'Early Bird Discount',
    'payment.date': 'Date',
    'payment.receipt_no': 'Receipt Number',
    'payment.received_from': 'Received From',
    'payment.no_records': 'No payment records found.',

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

    // Helpdesk
    'helpdesk.my_tickets': 'My Tickets',
    'helpdesk.new_ticket': 'New Ticket',
    'helpdesk.raise_ticket': 'Raise New Ticket',
    'helpdesk.subject': 'Subject',
    'helpdesk.description': 'Description',
    'helpdesk.priority': 'Priority',
    'helpdesk.submit': 'Submit Ticket',
    'helpdesk.select_ticket': 'Select a ticket to view conversation',

    // Members (Admin)
    'members.add': 'Add New Member',
    'members.outstanding_dues': 'Outstanding Dues',
    'members.paid_until': 'Paid Until',
    'members.residence_type': 'Residence Type',
  },

  ta: {
    // Common
    'logout': 'வெளியேறு',
    'welcome': 'வரவேற்கிறோம்',
    'loading': 'ஏற்றுகிறது...',
    'save': 'சேமி',
    'cancel': 'ரத்துசெய்',
    'edit': 'திருத்து',
    'delete': 'நீக்கு',
    'add': 'சேர்',
    'search': 'தேடு',
    'actions': 'செயல்கள்',
    'status': 'நிலை',
    'name': 'பெயர்',
    'email': 'மின்னஞ்சல்',
    'mobile': 'கைபேசி',
    'date': 'தேதி',
    'amount': 'தொகை',
    'notes': 'குறிப்புகள்',
    'yes': 'ஆம்',
    'no': 'இல்லை',
    'close': 'மூடு',
    'submit': 'சமர்ப்பி',
    'update': 'புதுப்பி',
    'view': 'பார்',
    'print': 'அச்சிடு',
    'download': 'பதிவிறக்கு',
    'language': 'மொழி',
    'language.english': 'ஆங்கிலம்',
    'language.tamil': 'தமிழ்',

    // Navigation — Tenant Admin
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

    // Navigation — Member
    'nav.home': 'என் முகப்பு',
    'nav.dues_history': 'பராமரிப்பு கட்டண வரலாறு',
    'nav.payment_history': 'கட்டண வரலாறு',
    'nav.receipts': 'ரசீதுகள்',
    'nav.society_events': 'சமூக நிகழ்வுகள்',
    'nav.my_profile': 'என் சுயவிவரம்',

    // Tenant Admin Header
    'header.admin_dashboard': 'நிர்வாக டாஷ்போர்டு',
    'header.treasurer_dashboard': 'கருவூலர் டாஷ்போர்டு',
    'header.society_dashboard': 'சமூக டாஷ்போர்டு',
    'header.transfer_cash': 'பணம் மாற்று',
    'header.record_payment': 'கட்டணம் பதிவு செய்',

    // Member Portal
    'member.portal_title': 'குடியிருப்பாளர் போர்டல்',
    'member.hello': 'வணக்கம்',
    'member.welcome_msg': 'உங்கள் குடியிருப்பு போர்டலுக்கு வரவேற்கிறோம்',
    'member.current_dues': 'தற்போதைய நிலுவை',
    'member.due_months': 'நிலுவை மாதங்கள்',
    'member.flat_details': 'வீடு விவரங்கள்',
    'member.annual_maintenance': 'ஆண்டு பராமரிப்பு செலவு',
    'member.no_dues': 'நிலுவைகள் எதுவும் இல்லை!',
    'member.pay_online': 'இப்போது ஆன்லைனில் செலுத்துங்கள்',
    'member.all_paid': 'அனைத்து மாதங்களும் செலுத்தப்பட்டது!',
    'member.unit': 'அலகு',
    'member.flat': 'வீடு',

    // Payments
    'payment.history': 'கட்டண வரலாறு',
    'payment.receipt': 'கட்டண ரசீது',
    'payment.period': 'கட்டண காலம்',
    'payment.mode': 'கட்டண முறை',
    'payment.base_amount': 'அடிப்படை தொகை',
    'payment.late_fee': 'தாமத கட்டணம்',
    'payment.total': 'மொத்த தொகை',
    'payment.early_bird': 'முன்கூட்டிய தள்ளுபடி',
    'payment.date': 'தேதி',
    'payment.receipt_no': 'ரசீது எண்',
    'payment.received_from': 'பெறப்பட்டது',
    'payment.no_records': 'கட்டண பதிவுகள் எதுவும் இல்லை.',

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

    // Helpdesk
    'helpdesk.my_tickets': 'என் புகார்கள்',
    'helpdesk.new_ticket': 'புதிய புகார்',
    'helpdesk.raise_ticket': 'புதிய புகார் பதிவு',
    'helpdesk.subject': 'தலைப்பு',
    'helpdesk.description': 'விவரம்',
    'helpdesk.priority': 'முன்னுரிமை',
    'helpdesk.submit': 'புகார் சமர்ப்பி',
    'helpdesk.select_ticket': 'உரையாடலை பார்க்க புகாரை தேர்ந்தெடுக்கவும்',

    // Members (Admin)
    'members.add': 'புதிய உறுப்பினர் சேர்',
    'members.outstanding_dues': 'நிலுவை நிலுவைகள்',
    'members.paid_until': 'வரை செலுத்தப்பட்டது',
    'members.residence_type': 'வாழ்விட வகை',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Read from localStorage — persists across logout since it's not cleared on logout
    const saved = localStorage.getItem('app_language') as Language | null;
    return saved === 'en' || saved === 'ta' ? saved : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] ?? translations['en'][key] ?? key;
  };

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
