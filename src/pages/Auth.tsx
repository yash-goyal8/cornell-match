import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const navigate = useNavigate();

  // DEV MODE: Bypass authentication - redirect immediately to main UI
  useEffect(() => {
    navigate('/');
  }, [navigate]);

  return null;
};

export default Auth;
