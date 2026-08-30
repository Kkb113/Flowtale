import { getCookieHeaderForUrl, getAbsoluteUrl } from "./utils";

describe("utils", () => {
  describe("#getCookieHeaderForUrl", () => {
    const allCookies: chrome.cookies.Cookie[] = [
      {
        domain: ".google.com",
        expirationDate: 1672995089,
        hostOnly: false,
        httpOnly: false,
        name: "__utma",
        path: "/forms/about/",
        sameSite: "unspecified",
        secure: false,
        session: false,
        storeId: "0",
        value: "ab",
      },
      {
        domain: ".google.com",
        expirationDate: 1673714247,
        hostOnly: false,
        httpOnly: false,
        name: "__utma",
        path: "/analytics/web",
        sameSite: "unspecified",
        secure: false,
        session: false,
        storeId: "0",
        value: "cd",
      },
      {
        domain: "analytics.google.com",
        expirationDate: 1669742982.760138,
        hostOnly: true,
        httpOnly: false,
        name: "GA_XSRF_TOKEN",
        path: "/analytics/",
        sameSite: "unspecified",
        secure: true,
        session: false,
        storeId: "0",
        value: "ef",
      },
      {
        domain: ".google.com",
        expirationDate: 1703393125.220652,
        hostOnly: false,
        httpOnly: true,
        name: "__Secure-1PSID",
        path: "/",
        sameSite: "unspecified",
        secure: true,
        session: false,
        storeId: "0",
        value: "gh",
      },
      {
        domain: "analytics.google.com",
        hostOnly: true,
        httpOnly: false,
        name: "S",
        path: "/",
        sameSite: "unspecified",
        secure: false,
        session: true,
        storeId: "0",
        value: "ij",
      },
      {
        domain: ".google.com",
        expirationDate: 1685517120.909061,
        hostOnly: false,
        httpOnly: true,
        name: "NID",
        path: "/",
        sameSite: "no_restriction",
        secure: true,
        session: false,
        storeId: "0",
        value: "kl",
      },
      {
        domain: ".google.com",
        expirationDate: 1672299671.72149,
        hostOnly: false,
        httpOnly: false,
        name: "1P_JAR",
        path: "/",
        sameSite: "no_restriction",
        secure: true,
        session: false,
        storeId: "0",
        value: "2022-11-29-07",
      },
    ];
    it("should extract create cookie header for correct domain", () => {
      const setCookieStr = getCookieHeaderForUrl(
        allCookies,
        new URL(
          "https://analytics.google.com/analytics/web/#/report-home/a175445601w243254508p226541679"
        )
      );

      const exp = [
        "1P_JAR=2022-11-29-07",
        "NID=kl",
        "S=ij",
        "__Secure-1PSID=gh",
        "GA_XSRF_TOKEN=ef",
        "__utma=cd",
      ];

      expect(
        setCookieStr
          .split(";")
          .map((_) => _.trim())
          .sort()
      ).toEqual(exp.sort());
    });
  });

  describe("#getAbsoluteUrl", () => {
    it("should return the same url if the url is already aboslute", () => {
      const absoluteUrl = getAbsoluteUrl(
        "https://acme.com/calendar/_/web/calendar-static/_/ss/k",
        "https://api.acme.com/"
      );

      expect(absoluteUrl).toEqual(
        "https://acme.com/calendar/_/web/calendar-static/_/ss/k"
      );
    });

    it("should return the absolute url if the url is already relative but starts from root", () => {
      const absoluteUrl = getAbsoluteUrl(
        "/calendar/_/web/calendar-static/_/ss/k",
        "https://api.acme.com/u/0/user/"
      );

      expect(absoluteUrl).toEqual(
        "https://api.acme.com/calendar/_/web/calendar-static/_/ss/k"
      );
    });

    it("should return the absolute url if the url is already relative", () => {
      const absoluteUrl = getAbsoluteUrl(
        "calendar/_/web/calendar-static/_/ss/k",
        "https://api.acme.com/u/0/user/"
      );

      expect(absoluteUrl).toEqual(
        "https://api.acme.com/u/0/user/calendar/_/web/calendar-static/_/ss/k"
      );
    });
  });
});
