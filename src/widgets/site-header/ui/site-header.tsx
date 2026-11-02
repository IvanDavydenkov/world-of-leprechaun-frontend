import { useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Drawer,
  IconButton,
  Link,
  Stack,
  SvgIcon,
  Tooltip,
  Typography,
} from "@mui/material";
import { BrandMark } from "../../../shared/ui/brand-mark";
import { useGetSessionQuery } from "../../../entities/session";
import { SignOutButton } from "../../../features/sign-out";
import { ManageVpnServers } from "../../../features/manage-vpn-servers";
import { ConfigUpdateNotice } from "./config-update-notice";

const navigation = [
  { label: "Личный кабинет", href: "/" },
  { label: "Пользователи", href: "/admin/users-list" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [serversOpen, setServersOpen] = useState(false);
  const { data, error } = useGetSessionQuery();
  const session = !error ? data : undefined;
  const { pathname } = useLocation();
  const isAdmin = session?.role === "admin";
  const isActive = (href: string) => href === pathname;

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
            gap: { xs: isAdmin ? 1 : 2, lg: 2 },
          }}
        >
          <Link
            component={RouterLink}
            to="/"
            aria-label="Мир лепреконов — главная"
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
            <Typography
              sx={{
                fontSize: { xs: 18, md: 22 },
                fontWeight: 500,
                lineHeight: 1.2,
                maxWidth: { xs: isAdmin ? 100 : 140, sm: "none" },
              }}
            >
              Мир лепреконов
            </Typography>
          </Link>
          {isAdmin && (
            <Stack
              component="nav"
              aria-label="Основная навигация"
              direction="row"
              spacing={1}
              sx={{ display: { xs: "none", lg: "flex" } }}
            >
              {navigation.map(({ label, href }) => (
                <Button
                  key={href}
                  component={RouterLink}
                  to={href}
                  color={isActive(href) ? "primary" : "inherit"}
                  aria-current={isActive(href) ? "page" : undefined}
                  sx={{
                    px: 1.5,
                    minHeight: 44,
                    color: isActive(href) ? "primary.main" : "text.secondary",
                    bgcolor: isActive(href) ? "rgba(217,186,115,.08)" : undefined,
                  }}
                >
                  {label}
                </Button>
              ))}
            </Stack>
          )}
          {isAdmin && (
            <Tooltip title="Серверы">
              <Button
                aria-label="Серверы"
                onClick={() => setServersOpen(true)}
                sx={{ minWidth: { xs: 44, lg: 110 }, height: 44, ml: "auto", flexShrink: 0, px: { xs: 1, lg: 2 } }}
              >
                <SvgIcon sx={{ display: { xs: "block", lg: "none" } }}>
                  <path d="M3 3h18v8H3V3zm2 2v4h14V5H5zm-2 8h18v8H3v-8zm2 2v4h14v-4H5zm2-9h2v2H7V6zm0 10h2v2H7v-2z" />
                </SvgIcon>
                <Box component="span" sx={{ display: { xs: "none", lg: "inline" } }}>Серверы</Box>
              </Button>
            </Tooltip>
          )}
          <Box sx={{ display: isAdmin ? { xs: 'none', lg: 'block' } : session ? 'block' : { xs: 'none', md: 'block' }, minWidth: 0 }}>
            <Typography
              sx={{
                display: { xs: "none", md: "block" },
                fontSize: 12,
                letterSpacing: ".06em",
                color: "text.secondary",
                borderLeft: 1,
                borderColor: "divider",
                pl: 3,
                maxWidth: 190,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {session
                ? session.display_name || "Пользователь"
                : "ЛИЧНЫЙ КАБИНЕТ"}
            </Typography>
            {session && <SignOutButton />}
          </Box>
          {isAdmin && (
            <IconButton
              aria-label="Открыть меню"
              aria-expanded={menuOpen}
              aria-controls={menuOpen ? "mobile-navigation" : undefined}
              onClick={() => setMenuOpen(true)}
              sx={{
                display: { lg: "none" },
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
          )}
        </Stack>
      </Container>
      {session && <ConfigUpdateNotice key={session.id} userId={session.id} />}
      {isAdmin && serversOpen && <ManageVpnServers onClose={() => setServersOpen(false)} />}
      {isAdmin && (
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
            {session && (
              <Typography sx={{ px: 2, overflowWrap: "anywhere" }}>
                {session.display_name || "Пользователь"}
              </Typography>
            )}
            {navigation.map(({ label, href }) => (
              <Button
                key={href}
                component={RouterLink}
                to={href}
                aria-current={isActive(href) ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
                sx={{ justifyContent: "flex-start", minHeight: 52, px: 2 }}
              >
                {label}
              </Button>
            ))}
            {session && <SignOutButton />}
          </Stack>
        </Drawer>
      )}
    </Box>
  );
}
