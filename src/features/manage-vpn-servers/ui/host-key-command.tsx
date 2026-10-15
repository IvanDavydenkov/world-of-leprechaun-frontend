import { useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";

const command = `awk '{print $1, $2}' /etc/ssh/ssh_host_ed25519_key.pub`;

export function HostKeyCommand() {
  const [status, setStatus] = useState("");
  const [copying, setCopying] = useState(false);

  async function copy() {
    setCopying(true);
    setStatus("");
    try {
      await navigator.clipboard.writeText(command);
      setStatus("Команда скопирована.");
    } catch {
      setStatus("Не удалось скопировать. Выделите команду и скопируйте вручную.");
    } finally {
      setCopying(false);
    }
  }

  return (
    <Stack spacing={1} sx={{ mt: 2 }}>
      <Typography color="text.secondary" sx={{ fontSize: 13 }}>
        Выполните команду в консоли сервера и вставьте результат в поле выше:
      </Typography>
      <Box component="code" sx={{ p: 1.5, bgcolor: "rgba(0,0,0,.2)", borderRadius: 1, fontSize: 12, overflowWrap: "anywhere", userSelect: "all" }}>
        {command}
      </Box>
      <Button onClick={() => void copy()} disabled={copying} aria-label="Копировать команду получения SSH-ключа" sx={{ alignSelf: "flex-start", minHeight: 44, minWidth: 120 }}>
        Копировать
      </Button>
      <Typography role="status" sx={{ fontSize: 12, minHeight: "1.5em" }} color="text.secondary">{status}</Typography>
    </Stack>
  );
}
