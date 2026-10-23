import { Link } from 'react-router-dom';
import classes from './AppLayout.module.css';
import D20Icon from './D20Icon';

// Логотип в шапке: кубик d20, «DnD» латунью (в светлой схеме — кожей) и мелкое
// «ONLINE», которое на телефоне прячется. Макет — вариант Е «латунь со свечением».
function AppLogo() {
  return (
    <Link to="/" className={classes.logo} aria-label="DnD Online, на главную">
      <D20Icon className={classes.die} />
      <span className={classes.wordmark}>
        <span className={classes.word}>DnD</span>
        <span className={classes.sub}>ONLINE</span>
      </span>
    </Link>
  );
}

export default AppLogo;
