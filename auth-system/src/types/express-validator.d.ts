import { Request } from 'express';

declare module 'express-validator' {
  export function validationResult(req: Request): {
    isEmpty(): boolean;
    array(): any[];
    mapped(): { [key: string]: any };
  };
  
  export function check(field?: string | string[], message?: any): any;
  export function body(field?: string | string[], message?: any): any;
  export function param(field?: string | string[], message?: any): any;
  export function query(field?: string | string[], message?: any): any;
  export function cookie(field?: string | string[], message?: any): any;
  export function header(field?: string | string[], message?: any): any;
}
