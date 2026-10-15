import type { PropsWithChildren } from "react";
import { Box, Container, Stack, Typography } from "@mui/material";
import { BrandMark } from "../../../shared/ui/brand-mark";

export function CabinetLayout({ children }: PropsWithChildren) {
  return (
    <Box
      sx={{
        minHeight: { xs: "calc(100svh - 80px)", md: "calc(100svh - 100px)" },
        display: "flex",
        flexDirection: "column",
        backgroundImage:
          "radial-gradient(ellipse at 90% 0%, rgba(51,95,66,.18), transparent 55%)",
      }}
    >
      <Container
        component="main"
        id="main-content"
        tabIndex={-1}
        maxWidth="lg"
        sx={{ flex: 1, py: { xs: 4, md: 7 }, outline: "none" }}
      >
        {children}
      </Container>
      <Container component="footer" maxWidth="lg">
        <Stack
          direction={{ xs: "column", sm: "row" }}
          sx={{
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            gap: 2,
            py: 3,
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
            <BrandMark sx={{ fontSize: 18, color: "primary.main" }} />
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              Мир лепреконов
            </Typography>
          </Stack>
          <Typography
            sx={{
              fontSize: 11,
              letterSpacing: ".08em",
              color: "text.secondary",
            }}
          >
            НЕМНОГО МАГИИ. БОЛЬШЕ СВОБОДЫ.
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
