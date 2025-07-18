import { Stack } from "@mui/material";
import { BrowserRouter } from "react-router-dom";
import { Navbar } from "./Navbar";

export const Router = () => {

  return (
    <BrowserRouter>
      <Stack minHeight="100vh">
        <Navbar />
      </Stack>
    </BrowserRouter>
  );
};
