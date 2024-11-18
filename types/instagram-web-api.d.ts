// in types/instagram-web-api.d.ts
// declare module 'instagram-web-api' {
//   class Instagram {
//     constructor(options: { username: string; password: string });
//     login(): Promise<void>;
//     getMediaByShortcode(params: { shortcode: string }): Promise<any>;
//     // Add other method signatures as needed
//   }
//   export = Instagram;
// }

// In 'types/instagram-web-api.d.ts'
declare module 'instagram-web-api' {
  export interface InstagramOptions {
    username: string;
    password: string;
  }

  // Use 'any' as a fallback if type inference fails
  export class Instagram {
    constructor(options: InstagramOptions);
    login(): Promise<void>;
    getMediaByUrl(params: { url: string }): Promise<any>;
    getMediaByShortcode(params: { shortcode: string }): Promise<any>;
    [key: string]: any;  // Fallback for unknown methods or properties
  }
}
