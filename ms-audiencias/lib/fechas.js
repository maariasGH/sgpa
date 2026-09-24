const ZONA_HORARIA = process.env.APP_TIMEZONE || 'America/Argentina/Buenos_Aires';

// Fecha de hoy (YYYY-MM-DD) en la zona horaria del Poder Judicial
const hoy = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA }).format(new Date());

// Suma días a una fecha YYYY-MM-DD
const sumarDias = (fecha, dias) => {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

// Traduce ?rango=hoy|semana|mes|anio a { desde, hasta }
const rangoPredefinido = (rango, referencia = hoy()) => {
  const [anio, mes] = referencia.split('-');
  switch (rango) {
    case 'hoy':
      return { desde: referencia, hasta: referencia };
    case 'semana': {
      // Semana de lunes a domingo que contiene la fecha de referencia
      const diaSemana = (new Date(`${referencia}T00:00:00Z`).getUTCDay() + 6) % 7;
      const desde = sumarDias(referencia, -diaSemana);
      return { desde, hasta: sumarDias(desde, 6) };
    }
    case 'anio':
      return { desde: `${anio}-01-01`, hasta: `${anio}-12-31` };
    case 'mes':
    default: {
      const ultimoDia = new Date(Date.UTC(Number(anio), Number(mes), 0)).getUTCDate();
      return { desde: `${anio}-${mes}-01`, hasta: `${anio}-${mes}-${String(ultimoDia).padStart(2, '0')}` };
    }
  }
};

module.exports = { hoy, sumarDias, rangoPredefinido };
