declare module 'google-tts-api' {
  export interface TTSOptions {
    lang?: string;
    slow?: boolean;
    host?: string;
    timeout?: number;
    splitPunct?: string;
  }

  export function getAudioUrl(
    text: string,
    options?: TTSOptions
  ): string;

  export function getAllAudioUrls(
    text: string,
    options?: TTSOptions
  ): Promise<Array<{ text: string; url: string }>>;

  export default {
    getAudioUrl,
    getAllAudioUrls
  };
}
