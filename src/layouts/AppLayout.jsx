import { Outlet } from "react-router-dom";
import Header from "../components/Header";

const AppLayout = () => {
  return (
    <div className="">
      <div className="grid-background"></div>
      <main className="px-4 min-h-screen container">
        <Header />
        <Outlet />
      </main>
      <div className="p-10 text-center bg-gray-800 mt-10">
        By BELCADI OUSSAMA
      </div>
    </div>
  );
};

export default AppLayout;