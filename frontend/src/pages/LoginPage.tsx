import { SignIn } from "@clerk/clerk-react";
import { Shield } from "lucide-react";

const LoginPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#fafafa]">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 shadow-lg bg-[#0d0d12]">
          <Shield size={28} className="text-white" />
        </div>
        <h1 className="text-4xl heading-serif text-[#0d0d12]">SentinelX</h1>
        <p className="text-slate-500 text-sm mt-2 font-medium">Enterprise Data Reliability Platform</p>
      </div>

      <SignIn 
        routing="path" 
        path="/login" 
        signUpUrl="/register"
        forceRedirectUrl="/incidents"
        appearance={{
          elements: {
            rootBox: "shadow-2xl rounded-3xl overflow-hidden border border-[#e8e8ee]",
            card: "bg-white p-8",
            headerTitle: "text-xl font-bold text-slate-900",
            headerSubtitle: "text-sm text-slate-500",
            formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-[0.2em] py-4 rounded-xl shadow-[0_8px_20px_rgba(37,99,235,0.25)]",
            socialButtonsBlockButton: "border border-slate-200 rounded-xl hover:bg-slate-50 transition-all",
            formFieldLabel: "text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]",
            formFieldInput: "px-5 py-3.5 rounded-xl border border-slate-200 focus:ring-blue-100",
            footerActionLink: "text-blue-600 font-bold hover:text-blue-700 underline decoration-blue-200 underline-offset-4"
          }
        }}
      />
      
      <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-10">
        © 2025 SentinelX Systems · Node 01
      </p>
    </div>
  );
};

export default LoginPage;
