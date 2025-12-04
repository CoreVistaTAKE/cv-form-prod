// utils/theme.ts`
export type Theme = "black"|"white"|"red"|"blue"|"yellow"|"green";
export function applyTheme(t?: Theme){
  try{
    const v = t || (typeof window!=="undefined" ? (localStorage.getItem("cv_theme") as Theme) : "black") || "black";
    if(typeof document!=="undefined"){ document.documentElement.setAttribute("data-theme", v); }
  }catch{}
}