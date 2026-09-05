export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="w-full py-6 px-6 sm:px-10 lg:px-14 xl:px-16">
        <p className="text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} Shoppie, Inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
