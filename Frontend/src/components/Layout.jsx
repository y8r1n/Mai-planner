import NavBar from "./NavBar";
import { Outlet } from "react-router-dom";
import NotificationManager from './NotificationManager';

export default function Layout() {
  return (
    <>
      <NavBar />
      <Outlet />
      <NotificationManager />  {/* ← 이거 한 줄만 추가! */}
      
    </>
  );
}
