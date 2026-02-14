import React from "react";
export default function SectionDivider() {
  return (
    <div className="flex justify-center mb-10">
      <span className="w-24 h-[2px] bg-gold relative">
        <span className="absolute left-1/2 -translate-x-1/2 -top-2 text-gold">
          ❧
        </span>
      </span>
    </div>
  );
}
