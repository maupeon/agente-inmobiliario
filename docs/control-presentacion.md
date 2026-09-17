# Presentar con el celular

El mando permite avanzar, retroceder, saltar a una diapositiva —incluidos los anexos— y reproducir o pausar el vídeo de la presentación. El celular muestra las notas de la diapositiva y el cronómetro de la presentación; el público sigue viendo únicamente la presentación de la computadora.

## Vincular el mando

1. Abre `/presentacion` en la computadora y pulsa **Control con celular** o la tecla **M**.
2. Inicia la sesión del mando y escanea el QR con la cámara del celular.
3. Abre el enlace y espera a que aparezca la conexión con la presentación. Utiliza los botones **Anterior** y **Siguiente** desde el celular.
4. El diálogo de la computadora se cierra automáticamente al conectar el celular. Puedes abrirlo de nuevo cuando lo necesites; cerrarlo no desconecta el mando.
5. Al terminar, vuelve a abrir **Control con celular** y pulsa **Desconectar**. El enlace de esa sesión deja de controlar la presentación. Si recargas la página en la computadora, tendrás que generar y escanear un QR nuevo.

El cronómetro es el mismo que aparece en la presentación: arranca al navegar por primera vez a otra diapositiva y puedes pausarlo o continuarlo desde el celular. Vincular el mando o cerrar el diálogo no inicia ni detiene el reloj. Las notas se muestran en el celular, salvo que también las actives en la computadora con su atajo habitual.

## Si presentas desde localhost

`localhost` siempre se refiere al dispositivo que abre el enlace. Para que el QR funcione en el celular, la computadora y el celular deben estar conectados a la misma red Wi-Fi y la presentación debe aceptar conexiones de esa red:

```sh
npm run dev -- --hostname 0.0.0.0
```

Abre en la computadora la dirección que indique Next.js, por ejemplo `http://localhost:3000/presentacion`. El diálogo busca las direcciones IPv4 privadas de la computadora y propone primero las de Wi-Fi o Ethernet. El QR utiliza esa dirección de red y conserva el puerto del servidor. Si aparecen varias direcciones, elige la de la red compartida con el celular.

La computadora debe permanecer encendida, con la presentación abierta y el servidor en ejecución. Si el celular no abre la página, comprueba que no esté usando datos móviles, que el cortafuegos permita el servidor y que la red no aísle a sus clientes. Algunas redes de invitados y redes universitarias impiden que dos dispositivos se conecten entre sí.

Si la presentación está publicada en una URL HTTPS accesible desde ambos dispositivos, el QR utiliza esa URL y no es necesario compartir Wi-Fi.

## Configuración de la conexión

La sincronización utiliza Supabase Realtime Broadcast. La aplicación necesita estas dos variables públicas de navegador:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-publica-anon
```

Utiliza la clave pública `anon` del proyecto, nunca una clave `service_role`. Si cambias estas variables, reinicia el servidor de desarrollo; para una compilación de producción vuelve a compilar. No se necesita ninguna migración de base de datos para el mando.

Ambos dispositivos necesitan acceso a Internet para conectarse a Supabase, incluso cuando la presentación se sirve desde la computadora por Wi-Fi. Esta función no funciona sin conexión. También deben poder acceder al mismo proyecto de Supabase y tener permitido el acceso a sus canales públicos de Realtime Broadcast.

Cada sesión utiliza un secreto aleatorio de 256 bits como autorización para un canal público de Broadcast. El secreto viaja en el fragmento del enlace, después de `#`, y no se envía al servidor web al abrir la página. Quien tenga el QR o su enlace puede controlar esa sesión, por lo que debes compartirlo únicamente con quien vaya a presentar. Las notas forman parte del contenido de la aplicación y se muestran localmente en el mando; no se transmiten por Broadcast ni se guardan en una tabla para esta función.

La ruta `/api/presentacion/conexion` solo ofrece direcciones de red cuando se consulta desde un origen loopback local y la aplicación no se ejecuta en Vercel. No devuelve interfaces para la URL publicada ni para conexiones desde la red local; sus respuestas no se almacenan en caché.
