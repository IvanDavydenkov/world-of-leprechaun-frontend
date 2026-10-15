import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Drawer,
  IconButton,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { BrandMark } from "../../../shared/ui/brand-mark";

const navigation = [
  { label: "Обзор", href: "/" },
  { label: "Конфигурации", href: "/#configurations" },
  { label: "Подключение", href: "/#connection-guide" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Box
      component="header"
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 1100,
        bgcolor: "rgba(12,25,20,.94)",
        backdropFilter: "blur(16px)",
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Link
        href="#main-content"
        sx={{
          position: "absolute",
          left: 16,
          top: -100,
          "&:focus": {
            top: 8,
            zIndex: 1200,
            bgcolor: "background.paper",
            p: 2,
          },
        }}
      >
        К содержимому
      </Link>
      <Container maxWidth="lg">
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: { xs: 80, md: 100 },
            gap: 2,
          }}
        >
          <Link
            component={RouterLink}
            to="/"
            aria-label="World of Leprechaun — главная"
            underline="none"
            color="text.primary"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                display: "grid",
                placeItems: "center",
                width: 44,
                height: 48,
                border: "1px solid",
                borderColor: "primary.main",
                borderRadius: "15px 15px 19px 19px",
                color: "primary.main",
              }}
            >
              <BrandMark sx={{ fontSize: 32 }} />
            </Box>
            <Box>
              <Typography
                sx={{
                  fontSize: 10,
                  letterSpacing: ".23em",
                  color: "text.secondary",
                  lineHeight: 1.5,
                }}
              >
                WORLD OF
              </Typography>
              <Typography
                sx={{
                  fontFamily: "Georgia, serif",
                  fontSize: { xs: 21, md: 25 },
                  lineHeight: 1.15,
                }}
              >
                Leprechaun<span style={{ color: "#d9ba73" }}>.</span>
              </Typography>
            </Box>
          </Link>
          <Stack
            component="nav"
            aria-label="Основная навигация"
            direction="row"
            spacing={1}
            sx={{ display: { xs: "none", md: "flex" } }}
          >
            {navigation.map(({ label, href }, index) => (
              <Button
                key={href}
                href={href}
                color={index === 0 ? "primary" : "inherit"}
                aria-current={index === 0 ? "page" : undefined}
                sx={{
                  px: 2,
                  minHeight: 44,
                  color: index === 0 ? "primary.main" : "text.secondary",
                  bgcolor: index === 0 ? "rgba(217,186,115,.08)" : undefined,
                }}
              >
                {label}
              </Button>
            ))}
          </Stack>
          <Typography
            sx={{
              display: { xs: "none", md: "block" },
              fontSize: 12,
              letterSpacing: ".06em",
              color: "text.secondary",
              borderLeft: 1,
              borderColor: "divider",
              pl: 3,
            }}
          >
            ЛИЧНЫЙ КАБИНЕТ
          </Typography>
          <IconButton
            aria-label="Открыть меню"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? "mobile-navigation" : undefined}
            onClick={() => setMenuOpen(true)}
            sx={{
              display: { md: "none" },
              width: 44,
              height: 44,
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
            }}
          >
            <Box
              aria-hidden="true"
              sx={{
                display: "grid",
                gap: "5px",
                "& span": {
                  display: "block",
                  width: 18,
                  height: "1px",
                  bgcolor: "text.primary",
                },
              }}
            >
              <span />
              <span />
            </Box>
          </IconButton>
        </Stack>
      </Container>
      <Drawer
        anchor="right"
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        slotProps={{
          paper: {
            sx: { width: "min(320px, 90vw)", p: 3, backgroundImage: "none" },
          },
        }}
      >
        <Stack
          direction="row"
          sx={{ justifyContent: "space-between", alignItems: "center", mb: 4 }}
        >
          <Typography variant="h6">Навигация</Typography>
          <IconButton
            aria-label="Закрыть меню"
            onClick={() => setMenuOpen(false)}
            sx={{ width: 44, height: 44 }}
          >
            ×
          </IconButton>
        </Stack>
        <Stack
          id="mobile-navigation"
          component="nav"
          aria-label="Мобильная навигация"
          spacing={1}
        >
          {navigation.map(({ label, href }) => (
            <Button
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              sx={{ justifyContent: "flex-start", minHeight: 52, px: 2 }}
            >
              {label}
            </Button>
          ))}
        </Stack>
      </Drawer>
    </Box>
  );
}

