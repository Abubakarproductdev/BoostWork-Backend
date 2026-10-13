import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, UserRound } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { Button, Notice } from '../ui';

/**
 * Onboarding hint for the AI pages: the AI only uses experience from the user's
 * profile, so without one, proposals can't reference any past work.
 */
export default function ProfileSetupNotice() {
  const [isMissing, setIsMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    apiFetch('/api/portfolio')
      .then((response) => response.json())
      .then((data) => {
        if (cancelled || !data.success) return;
        const { profile = {}, projects = [] } = data.data || {};
        setIsMissing(!profile.title && !profile.bio && projects.length === 0);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isMissing) return null;

  return (
    <Notice
      tone="ember"
      icon={UserRound}
      action={<Link to="/profile"><Button size="sm" icon={ArrowRight}>Set up profile</Button></Link>}
    >
      <strong>Your profile is empty.</strong> The AI only mentions experience you've added, so add your title, bio and a few projects for much stronger results.
    </Notice>
  );
}
