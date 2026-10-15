import { Alert, Button, Stack } from "@mui/material";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { baseApi } from "../../../shared/api";
import { useSignOutMutation } from "../api/sign-out-api";
import { getSignOutError } from '../lib/get-sign-out-error';

export function SignOutButton() {
  const [signOut, { isLoading, isError, error }] = useSignOutMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  async function handleSignOut() {
    try {
      await signOut().unwrap();
      dispatch(baseApi.util.resetApiState());
      navigate("/login", { replace: true });
    } catch {
      // Ошибка отображается через состояние RTK Query; сессия не считается закрытой.
    }
  }

  return (
    <Stack spacing={1}>
      <Button
        onClick={handleSignOut}
        disabled={isLoading}
        sx={{ minHeight: 44 }}
      >
        {isLoading ? "Выходим…" : "Выйти"}
      </Button>
      {isError && (
        <Alert severity="error">{getSignOutError(error)}</Alert>
      )}
    </Stack>
  );
}
