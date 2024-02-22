import style from "./MainLayout.module.scss"


import Navbar from "./Navbar/Navbar";

import Sidebar from "./Sidebar/Sidebar";

import Popup from "./popup";
import Spinner from "./spinner";

import Loading from "./Loading/loading";

import { Outlet } from "react-router-dom";

function MainLayout() {
  return (
    <div className={style.mainLayOut}    >
      <Navbar />

      <Sidebar />

      <Popup />

      <Spinner/>
      

    

      <div id="detail">
        <Outlet />
      </div>
    </div>
  );
}

export default MainLayout;
