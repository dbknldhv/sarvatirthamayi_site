import React from "react";
export default function SectionHeading({ title, center = true }) {
  return (
    <div className={center ? "text-center" : "text-left"}>
      <h2 className="text-4xl text-primaryPurple font-belleza mb-4">
        {title}
      </h2>

      {/* Decorative Divider */}
      <div className={`flex ${center ? "justify-center" : "justify-start"} mb-10`}>
        <span className="w-24 h-[2px] bg-gold relative">
          <span className="absolute left-1/2 -translate-x-1/2 -top-2 text-gold">
            ❧
          </span>
        </span>
      </div>
    </div>
  );
}
