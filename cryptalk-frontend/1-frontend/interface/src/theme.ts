import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  fonts: {
    heading: "Inter, system-ui, sans-serif",
    body: "Inter, system-ui, sans-serif",
  },
  colors: {
    brand: {
      50: '#e6f0ff',
      100: '#bcd6ff',
      200: '#90bbff',
      300: '#64a0ff',
      400: '#3986ff',
      500: '#0F6FFF', // primary brand color
      600: '#0058e6',
      700: '#0042cc',
      800: '#002b99',
      900: '#001566',
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'brand',
      },
    },
  },
});

export default theme;
