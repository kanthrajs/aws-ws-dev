// src/interfaces/whatsapp.ts
export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    changes: Array<{
      field: string;
      value: {
        metadata?: { phone_number_id: string };
        messages?: Array<{
          type: string;
          text?: { body: string };
          interactive?: {
            list_reply?: { title: string };
            button_reply?: { id: string };
          };
          from?: string;
        }>;
        contacts?: Array<{ wa_id: string }>;
      };
    }>;
  }>;
}

export interface WhatsAppMessageContent {
  body?: string | {text:string};
  type?: string;
  header?: { type: string; text: string };
  action?: {
    button?: string;
    buttons?: Array<{ type: string; reply: { id: string; title: string } }>;
    sections?: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description: string }>;
    }>;
  };
}

export interface WhatsAppApiResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}
