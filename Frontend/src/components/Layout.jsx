import NavBar from "./NavBar";
import { Outlet } from "react-router-dom";
import NotificationManager from './NotificationManager';
import Footer from "../common/Footer.jsx";
import "../styles/Layout.css";

export default function Layout() {
  return (
    <>
    <div className="layout-wrapper">
      <NavBar />
      <Outlet />
      <NotificationManager /> 
      <Footer />
      </div>
    </>
  );
}
