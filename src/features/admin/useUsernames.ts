// Hook para obtener nombres de usuario por IDs
import { useEffect, useState } from 'react';

export function useUsernames(ids: string[]) {
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!ids.length) return;
    fetch(`/api/usernames?ids=${ids.join(',')}`)
      .then(res => res.json())
      .then(setUsernames)
      .catch(() => setUsernames({}));
  }, [ids.join(',')]);
  return usernames;
}
