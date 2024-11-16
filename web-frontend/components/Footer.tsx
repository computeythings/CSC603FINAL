import React from 'react';
import { Facebook, Linkedin, Youtube } from 'lucide-react'

const Footer: React.FC = () => {
  return (
    <div className="w-full text-white bg-slate-600" id="footer">
      <div className="flex flex-col justify-between max-w-screen-xl py-8 mx-auto gap-y-12 md:flex-row">
        <div className="flex flex-row flex-wrap ml-8 text-sm md:mr-8 gap-y-12">
          <div className='mr-8'>
            <div className="font-extrabold font-title mb-2">Resources</div>
            <div className="columns-3 break-inside-avoid-column gap-x-8 font-title">
              <a className="block hover:underline" id="footer_about" title="Learn about DocuMedIQ" href="/about/">Our Story</a>
              <a className="block hover:underline" href="/jobs" id="footer_careers" title="Learn about careers at DocuMedIQ">Careers</a>
              <a className="block hover:underline" id="footer_contact" title="See how to contact us" href="/contact/">Contact Us</a>
              <a className="block hover:underline" href="/community" id="footer_link" title="Visit DocuMedIQ Community Link">DocuMedIQ Community Link</a>
              <a className="block hover:underline" id="footer_giving" title="We give back to the community" href="/giving/">Giving</a>
              <a className="block hover:underline" id="footer_legaldisclosures" title="View some other legal resources" href="/legal-disclosures/">Legal</a>
              <a className="block hover:underline" id="footer_about_privacypolicies" title="View our privacy policies and security resources" href="/privacypolicies/">Security &amp; Privacy</a>
              <a className="block hover:underline" href="/training" id="footer_training" title="View learning resources">Training</a>
              <a className="block hover:underline" href="/efficiency" id="footer_efficiency.documediq.com" title="Cut clicks and save time">Efficiency</a>
              <a className="block hover:underline" id="footer_visiting" title="Read information about our campus" href="/visiting/">Visiting</a>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-5 pr-1 text-xs md:pr-6 pl-6 md:pl-0 font-title md:basis-[180px] md:shrink md:grow-0 lg:basis-auto lg:grow mt-auto">
          <div className="flex items-center justify-start gap-10 md:justify-end mb-2">
            <a href="https://img-cdn.tnwcdn.com/image?fit=1280%2C720&url=https%3A%2F%2Fcdn0.tnwcdn.com%2Fwp-content%2Fblogs.dir%2F1%2Ffiles%2F2020%2F01%2Fq3V3Xe3.jpg&signature=877938d1db7314da642c99678e80700c" id="footer_facebook" title="Visit us on Facebook" className="relative w-6 h-6">
            <Facebook size={42} className='' />
            </a>
            <a href="https://www.linkedin.com/company/wendys-international" id="footer_linkedin" title="Visit us on LinkedIn" className="relative w-6 h-6">
              <Linkedin size={42} className='' />
            </a>
            <a href="https://www.youtube.com/watch?v=mhQ39iBVUug" id="footer_youtube" title="Visit us on YouTube" className="relative w-6 h-6">
              <Youtube size={42} className='' />
            </a>
          </div>
          <div className="pl-2 font-medium text-left font-title md:text-right md:pl-0">Copyright © 2024 DocuMedIQ Systems Corporation.</div>
        </div>
      </div>
    </div>
  );
};

export default Footer;
