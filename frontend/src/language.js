import spanish from './translations.es.json';

export const LANGUAGE_STORAGE_KEY='bario_language';
export function translate(language,text,values={}) {
  if(typeof text!=='string') return text;
  const key=text.trim();
  const translated=language==='es' && Object.hasOwn(spanish,key) ? text.replace(key,()=>spanish[key]) : text;
  return translated.replace(/\{(\w+)\}/g,(match,key)=>Object.hasOwn(values,key)?String(values[key]):match);
}
export function translateError(language,text) {
  if(language!=='es'||!text) return text;
  if(Object.hasOwn(spanish,text.trim())) return translate(language,text);
  if(/Password should be at least \d+ characters\.?/i.test(text)) return 'La contraseña debe tener al menos '+text.match(/\d+/)[0]+' caracteres.';
  if(/rate limit|too many requests|security purposes/i.test(text)) return 'Demasiados intentos. Espera un momento y vuelve a intentarlo.';
  if(/expired|invalid.*token|session.*missing/i.test(text)) return 'La sesión o el enlace ha vencido o no es válido. Inicia sesión o solicita un nuevo enlace.';
  return 'No se pudo completar la solicitud. Inténtalo de nuevo o comunícate con BARIO si el problema continúa.';
}
