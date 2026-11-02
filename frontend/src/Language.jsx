import {createContext,useContext,useEffect,useMemo,useState} from 'react';
import {LANGUAGE_STORAGE_KEY,translate,translateError} from './language.js';

const LanguageContext=createContext(null);
export function LanguageProvider({children}) {
  const [language,setLanguage]=useState(()=>{
    try {return localStorage.getItem(LANGUAGE_STORAGE_KEY)==='es'?'es':'en';}
    catch {return 'en';}
  });
  useEffect(()=>{
    document.documentElement.lang=language;
    document.title=translate(language,'BARIO — Free Digital Membership');
    document.querySelector('meta[name="description"]')?.setAttribute('content',translate(language,'Free BARIO digital membership. Discover participating bars, track your visits, and plan your ride home.'));
    try {localStorage.setItem(LANGUAGE_STORAGE_KEY,language);} catch { /* The toggle still works without storage access. */ }
  },[language]);
  const value=useMemo(()=>({language,setLanguage,locale:language==='es'?'es-US':'en-US',t:(text,values)=>translate(language,text,values),errorText:text=>translateError(language,text)}),[language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useLanguage(){return useContext(LanguageContext);}
export function LanguageToggle(){
  const {language,setLanguage,t}=useLanguage();
  return <div className="language-toggle" role="group" aria-label={t('Language')}>
    <button type="button" lang="en" aria-pressed={language==='en'} onClick={()=>setLanguage('en')}>English</button>
    <button type="button" lang="es" aria-pressed={language==='es'} onClick={()=>setLanguage('es')}>Español</button>
  </div>;
}
