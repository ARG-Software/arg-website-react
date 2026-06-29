import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PROJECTS from '../data/projects.json';

export default function ProjectsPage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(`/projects/${PROJECTS[0].slug}/`, { replace: true });
  }, [navigate]);
  return null;
}
