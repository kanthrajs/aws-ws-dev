// src/utils/menu-options.ts
export interface MenuOption {
  id: string;
  title: string;
  description: string;
}

export interface MenuContent {
  type: 'list';
  header: { type: string; text: string };
  body: { text: string };
  action: {
    button: string;
    sections: Array<{
      title: string;
      rows: MenuOption[];
    }>;
  };
}

interface Translation {
  header: string;
  body: string;
  button: string;
  points: { title: string; description: string };
  orders: { title: string; description: string };
  contact: { title: string; description: string };
  language: { title: string; description: string };
  createOrder: { title: string; description: string };
}

export type Language = 'english' | 'kannada' | 'tamil' | 'telugu';

interface Translations {
  english: Translation;
  kannada: Translation;
  tamil: Translation;
  telugu: Translation;
}

export const getMainMenu = (language: Language = 'english'): MenuContent => {
  const translations: Translations = {
    english: {
      header: 'Main Menu',
      body: 'Welcome! Please select an option:',
      button: 'Choose Option',
      points: { title: 'View Purchase Points', description: 'Check your loyalty points' },
      orders: { title: 'My Orders', description: 'View your order history' },
      contact: { title: 'Contact Support', description: 'Get in touch with us' },
      language: { title: 'Change Language', description: 'Switch to English, Kannada, Tamil, or Telugu' },
      createOrder: { title: 'Create Order', description: 'Start a new order' },
    },
    kannada: {
      header: 'ಮುಖ್ಯ ಮೆನು',
      body: 'ಸ್ವಾಗತ! ದಯವಿಟ್ಟು ಒಂದು ಆಯ್ಕೆಯನ್ನು ಆರಿಸಿ:',
      button: 'ಆಯ್ಕೆ ಮಾಡಿ',
      points: { title: 'ಖರೀದಿ ಅಂಕಗಳು', description: 'ನಿಮ್ಮ ಲಾಯಲ್ಟಿ ಅಂಕಗಳನ್ನು ಪರಿಶೀಲಿಸಿ' },
      orders: { title: 'ನನ್ನ ಆರ್ಡರ್‌ಗಳು', description: 'ನಿಮ್ಮ ಆರ್ಡರ್ ಇತಿಹಾಸವನ್ನು ವೀಕ್ಷಿಸಿ' },
      contact: { title: 'ಸಂಪರ್ಕ ಬೆಂಬಲ', description: 'ನಮ್ಮೊಂದಿಗೆ ಸಂಪರ್ಕದಲ್ಲಿರಿ' },
      language: { title: 'ಭಾಷೆ ಬದಲಾಯಿಸಿ', description: 'ಇಂಗ್ಲಿಷ್, ಕನ್ನಡ, ತಮಿಳು ಅಥವಾ ತೆಲುಗಿಗೆ ಬದಲಾಯಿಸಿ' },
      createOrder: { title: 'ಆರ್ಡರ್ ರಚಿಸಿ', description: 'ಹೊಸ ಆರ್ಡರ್ ಪ್ರಾರಂಭಿಸಿ' },
    },
    tamil: {
      header: 'முதன்மை மெனு',
      body: 'வரவேற்கிறோம்! ஒரு விருப்பத்தைத் தேர்ந்தெடுக்கவும்:',
      button: 'விருப்பத்தைத் தேர்ந்தெடு',
      points: { title: 'வாங்குதல் புள்ளிகள்', description: 'உங்கள் விசுவாச புள்ளிகளைச் சரிபார்க்கவும்' },
      orders: { title: 'எனது ஆர்டர்கள்', description: 'உங்கள் ஆர்டர் வரலாற்றைப் பார்க்கவும்' },
      contact: { title: 'ஆதரவைத் தொடர்பு கொள்ளவும்', description: 'எங்களுடன் தொடர்பு கொள்ளவும்' },
      language: { title: 'மொழியை மாற்றவும்', description: 'ஆங்கிலம், கன்னடம், தமிழ் அல்லது தெலுங்கு மொழிக்கு மாறவும்' },
      createOrder: { title: 'ஆர்டர் உருவாக்கவும்', description: 'புதிய ஆர்டரைத் தொடங்கவும்' },
    },
    telugu: {
      header: 'మెయిన్ మెనూ',
      body: 'స్వాగతం! దయచేసి ఒక ఎంపికను ఎంచుకోండి:',
      button: 'ఎంపికను ఎంచుకోండి',
      points: { title: 'కొనుగోలు పాయింట్లు', description: 'మీ లాయల్టీ పాయింట్లను తనిఖీ చేయండి' },
      orders: { title: 'నా ఆర్డర్లు', description: 'మీ ఆర్డర్ చరిత్రను చూడండి' },
      contact: { title: 'సహాయం సంప్రదించండి', description: 'మాతో సంప్రదించండి' },
      language: { title: 'భాషను మార్చండి', description: 'ఇంగ్లీష్, కన్నడ, తమిళం లేదా తెలుగులోకి మారండి' },
      createOrder: { title: 'ఆర్డర్ సృష్టించండి', description: 'కొత్త ఆర్డర్‌ను ప్రారంభించండి' },
    },
  };

  const t = translations[language.toLowerCase() as Language] || translations.english;

  return {
    type: 'list',
    header: { type: 'text', text: t.header },
    body: { text: t.body },
    action: {
      button: t.button,
      sections: [
        {
          title: t.header,
          rows: [
            { id: 'view_points', title: t.points.title, description: t.points.description },
            { id: 'view_orders', title: t.orders.title, description: t.orders.description },
            { id: 'contact_support', title: t.contact.title, description: t.contact.description },
            { id: 'change_language', title: t.language.title, description: t.language.description },
            { id: 'create_order', title: t.createOrder.title, description: t.createOrder.description },
          ],
        },
      ],
    },
  };
};

export const getLanguageMenu = (): MenuContent => {
  return {
    type: 'list',
    header: { type: 'text', text: 'Choose Language' },
    body: { text: 'Select your preferred language:' },
    action: {
      button: 'Select Language',
      sections: [
        {
          title: 'Languages',
          rows: [
            { id: 'lang_english', title: 'English', description: 'Switch to English' },
            { id: 'lang_kannada', title: 'Kannada', description: 'Switch to Kannada' },
            { id: 'lang_tamil', title: 'Tamil', description: 'Switch to Tamil' },
            { id: 'lang_telugu', title: 'Telugu', description: 'Switch to Telugu' },
          ],
        },
      ],
    },
  };
};

export const getCreateOrderMenu = (language: Language = 'english'): MenuContent => {
  const translations: Translations = {
    english: {
      header: 'Create Order',
      body: 'Choose an option to proceed with your order:',
      button: 'Select Option',
      points: { title: 'View Purchase Points', description: 'Check your loyalty points' },
      orders: { title: 'My Orders', description: 'View your order history' },
      contact: { title: 'Contact Support', description: 'Get in touch with us' },
      language: { title: 'Change Language', description: 'Switch to English, Kannada, Tamil, or Telugu' },
      createOrder: { title: 'Create Order', description: 'Start a new order' },
    },
    kannada: {
      header: 'ಆರ್ಡರ್ ರಚಿಸಿ',
      body: 'ನಿಮ್ಮ ಆರ್ಡರ್‌ನೊಂದಿಗೆ ಮುಂದುವರಿಯಲು ಒಂದು ಆಯ್ಕೆಯನ್ನು ಆರಿಸಿ:',
      button: 'ಆಯ್ಕೆ ಆರಿಸಿ',
      points: { title: 'ಖರೀದಿ ಅಂಕಗಳು', description: 'ನಿಮ್ಮ ಲಾಯಲ್ಟಿ ಅಂಕಗಳನ್ನು ಪರಿಶೀಲಿಸಿ' },
      orders: { title: 'ನನ್ನ ಆರ್ಡರ್‌ಗಳು', description: 'ನಿಮ್ಮ ಆರ್ಡರ್ ಇತಿಹಾಸವನ್ನು ವೀಕ್ಷಿಸಿ' },
      contact: { title: 'ಸಂಪರ್ಕ ಬೆಂಬಲ', description: 'ನಮ್ಮೊಂದಿಗೆ ಸಂಪರ್ಕದಲ್ಲಿರಿ' },
      language: { title: 'ಭಾಷೆ ಬದಲಾಯಿಸಿ', description: 'ಇಂಗ್ಲಿಷ್, ಕನ್ನಡ, ತಮಿಳು ಅಥವಾ ತೆಲುಗಿಗೆ ಬದಲಾಯಿಸಿ' },
      createOrder: { title: 'ಆರ್ಡರ್ ರಚಿಸಿ', description: 'ಹೊಸ ಆರ್ಡರ್ ಪ್ರಾರಂಭಿಸಿ' },
    },
    tamil: {
      header: 'ஆர்டர் உருவாக்கவும்',
      body: 'உங்கள் ஆர்டருடன் தொடர ஒரு விருப்பத்தைத் தேர்ந்தெடுக்கவும்:',
      button: 'விருப்பத்தைத் தேர்ந்தெடு',
      points: { title: 'வாங்குதல் புள்ளிகள்', description: 'உங்கள் விசுவாச புள்ளிகளைச் சரிபார்க்கவும்' },
      orders: { title: 'எனது ஆர்டர்கள்', description: 'உங்கள் ஆர்டர் வரலாற்றைப் பார்க்கவும்' },
      contact: { title: 'ஆதரவைத் தொடர்பு கொள்ளவும்', description: 'எங்களுடன் தொடர்பு கொள்ளவும்' },
      language: { title: 'மொழியை மாற்றவும்', description: 'ஆங்கிலம், கன்னடம், தமிழ் அல்லது தெலுங்கு மொழிக்கு மாறவும்' },
      createOrder: { title: 'ஆர்டர் உருவாக்கவும்', description: 'புதிய ஆர்டரைத் தொடங்கவும்' },
    },
    telugu: {
      header: 'ఆర్డర్ సృష్టించండి',
      body: 'మీ ఆర్డర్‌తో కొనసాగడానికి ఒక ఎంపికను ఎంచుకోండి:',
      button: 'ఎంపికను ఎంచుకోండి',
      points: { title: 'కొనుగోలు పాయింట్లు', description: 'మీ లాయల్టీ పాయింట్లను తనిఖీ చేయండి' },
      orders: { title: 'నా ఆర్డర్లు', description: 'మీ ఆర్డర్ చరిత్రను చూడండి' },
      contact: { title: 'సహాయం సంప్రదించండి', description: 'మాతో సంప్రదించండి' },
      language: { title: 'భాషను మార్చండి', description: 'ఇంగ్లీష్, కన్నడ, తమిళం లేదా తెలుగులోకి మారండి' },
      createOrder: { title: 'ఆర్డర్ సృష్టించండి', description: 'కొత్త ఆర్డర్‌ను ప్రారంభించండి' },
    },
  };

  const t = translations[language.toLowerCase() as Language] || translations.english;

  return {
    type: 'list',
    header: { type: 'text', text: t.header },
    body: { text: t.body },
    action: {
      button: t.button,
      sections: [
        {
          title: t.header,
          rows: [
            { id: 'browse_products', title: 'Browse Products', description: 'Start shopping for products' },
            { id: 'back_to_main', title: 'Back to Main Menu', description: 'Return to the main menu' },
          ],
        },
      ],
    },
  };
};