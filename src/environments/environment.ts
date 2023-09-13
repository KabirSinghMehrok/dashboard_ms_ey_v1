// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {  
  production: false,
  // apiURL: 'https://qr.staging.cqube.samagra.io',
  apiURL: 'http://localhost:3008',
  // apiURL: 'http://192.168.1.159:3008',
  stateCode: "NA",
  numberFormat: {
    reports: {
      locale: 'en-IN',
      format: 'short'
    }
  },
  config: "NVSK",
  loginNeeded: true,
  guestUsername: "guest-user",
  guestPassword: "guest"
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
