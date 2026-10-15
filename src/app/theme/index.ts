import "@fontsource/roboto/latin-400.css";
import "@fontsource/roboto/cyrillic-400.css";
import "@fontsource/roboto/latin-500.css";
import "@fontsource/roboto/cyrillic-500.css";
import "@fontsource/roboto/latin-600.css";
import "@fontsource/roboto/cyrillic-600.css";
import "@fontsource/roboto/latin-700.css";
import "@fontsource/roboto/cyrillic-700.css";
import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#d9ba73", contrastText: "#18291f" },
    secondary: { main: "#9ccbb0" },
    background: { default: "#0c1914", paper: "#13251d" },
    text: { primary: "#f5f3e9", secondary: "#a4b5aa" },
    divider: "rgba(191, 211, 192, 0.13)",
  },
  typography: {
    fontFamily: '"Roboto", Arial, sans-serif',
    h1: { fontWeight: 400 },
    h2: { fontWeight: 400 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { scrollBehavior: "smooth", scrollPaddingTop: 110 },
        body: { minWidth: 0 },
        "::selection": { background: "#d9ba73", color: "#0c1914" },
        "*:focus-visible": { outline: "2px solid #d9ba73", outlineOffset: 4 },
        "@media (prefers-reduced-motion: reduce)": {
          html: { scrollBehavior: "auto" },
        },
      },
    },
    MuiButton: { defaultProps: { disableElevation: true } },
  },
});
