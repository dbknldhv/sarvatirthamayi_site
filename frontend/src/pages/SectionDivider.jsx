import React from "react";

export default function SectionDivider() {
  return (
    <div className="flex items-center justify-center w-full max-w-[320px] mx-auto mt-6 mb-10">
      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-amber-600/40 to-transparent" />
      
      {/* Sacred Geometry Elements */}
      <div className="flex items-center gap-1 mx-3">
        <div className="w-1.5 h-1.5 rotate-45 border border-amber-600/50" />
        <div className="w-2.5 h-2.5 rotate-45 bg-amber-600 shadow-[0_0_10px_rgba(217,119,6,0.4)]" />
        <div className="w-1.5 h-1.5 rotate-45 border border-amber-600/50" />
      </div>
      
      <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-amber-600/40 to-transparent" />
    </div>
  );
}