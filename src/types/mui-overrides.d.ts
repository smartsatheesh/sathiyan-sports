// Temporary Material-UI type overrides to fix complex union type issues
declare module '@mui/material/Box' {
  interface BoxProps {
    sx?: any;
    component?: any;
  }
}

declare module '@mui/material/Avatar' {
  interface AvatarProps {
    sx?: any;
  }
}

declare module '@mui/material/Button' {
  interface ButtonProps {
    sx?: any;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyProps {
    sx?: any;
  }
}

declare module '@mui/material/Container' {
  interface ContainerProps {
    sx?: any;
  }
}

declare module '@mui/material/AppBar' {
  interface AppBarProps {
    sx?: any;
  }
}
