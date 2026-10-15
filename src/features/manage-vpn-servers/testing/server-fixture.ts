export const testServer = {
  id: "server-1", name: "Основной", ssh_address: "vpn.example.org:22", ssh_username: "root",
  ssh_host_key: `ssh-ed25519 ${btoa("\x00\x00\x00\x0bssh-ed25519\x00\x00\x00\x20" + "a".repeat(32))}`,
  public_endpoint: "vpn.example.org:39977", container: "amnezia-awg2", interface: "awg0",
  password_set: true, revision: 1, created_at: "2026-10-15T12:00:00Z", updated_at: "2026-10-15T12:00:00Z",
};
