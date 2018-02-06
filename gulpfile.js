/*=====================================
=            Gulp Packages            =
=====================================*/
require("es6-promise").polyfill()

var gulp = require("gulp"),
    fs = require("fs"),
    concat = require("gulp-concat"),
    uglify = require("gulp-uglify"),
    svgmin = require("gulp-svgmin"),
    imagemin = require("gulp-imagemin"),
    utility = require("gulp-util"),
    watch = require("gulp-watch"),
    streamqueue = require("streamqueue"),
    plumber = require("gulp-plumber"),
    shell = require("gulp-shell"),
    sourcemaps = require("gulp-sourcemaps"),
    postcss = require("gulp-postcss"),
    svgstore = require("gulp-svgstore"),
    babel = require("gulp-babel"),
    browserSync = require("browser-sync").create()

// Read our Settings Configuration
var settings = JSON.parse(fs.readFileSync("./settings.json"))

var config = {
    production: !!utility.env.production
}

/*==================================
=            Base Paths            =
==================================*/
var themeBase = "./wp-content/themes/"
var themeName = "base"

// Style Path
var stylePathSrc = themeBase + themeName + "/assets/css/base.css"
var stylePathWatch = themeBase + themeName + "/assets/css/**/*.css"
var stylePathDest = themeBase + themeName + "/library/css/"

// Script Path
var scriptsPathSrc = [
    themeBase + themeName + "/assets/js/_lib/**/*.js",
    themeBase + themeName + "/assets/js/_src/**/*.js",
    themeBase + themeName + "/assets/js/application.js"
]
var scriptsPathWatch = themeBase + themeName + "/assets/js/**/*.js"
var scriptsPathDest = themeBase + themeName + "/library/js/"

// Sprites Path
var svgPathWatch = themeBase + themeName + "/assets/svg/*.svg"
var svgDest = themeBase + themeName + "/library/svg"

// Image Path
var imgPathWatch = themeBase + themeName + "/assets/img/*"
var imgDest = themeBase + themeName + "/library/img"

// PHP Paths
var phpPath = themeBase + themeName + "/**/*.php"

/*=============================
=            Tasks            =
=============================*/
// Compile, prefix, minify and move our SCSS files
gulp.task("stylesheets", function() {
    var processors = [
        require("postcss-import")(),
        require("postcss-url")(),
        require("postcss-utilities")(),
        require("postcss-mixins")(),
        require("postcss-cssnext")({
            features: {
                customProperties: {
                    preserve: true
                }
            }
        }),
        require("css-mqpacker")(),
        require("postcss-namespace")(),
        require("cssnano")({
            discardComments: {
                removeAll: true
            },
            filterPlugins: false,
            discardEmpty: false,
            autoprefixer: false
        }),
        require("postcss-reporter")({ clearReportedMessages: true })
    ]
    return gulp
        .src(stylePathSrc)
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(postcss(processors))
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest(stylePathDest))
        .pipe(
            config.production
                ? utility.noop()
                : browserSync.reload({ stream: true })
        )
})

// Compile (in order), concatenate, minify, rename and move our JS files
gulp.task("scripts", function() {
    return streamqueue(
        { objectMode: true },
        gulp.src(themeBase + themeName + "/assets/js/_lib/**/*.js"),
        gulp.src(themeBase + themeName + "/assets/js/_src/**/*.js"),
        gulp.src(themeBase + themeName + "/assets/js/application.js")
    )
        .pipe(plumber())
        .pipe(babel({ presets: ["env"] }))
        .pipe(concat("application.js", { newLine: ";" }))
        .pipe(uglify())
        .pipe(gulp.dest(scriptsPathDest))
        .pipe(
            config.production
                ? utility.noop()
                : browserSync.reload({ stream: true })
        )
})

gulp.task("svgs", function() {
    return gulp
        .src(svgPathWatch)
        .pipe(plumber())
        .pipe(
            svgmin({
                plugins: [
                    { removeEmptyAttrs: false },
                    { removeEmptyNS: false },
                    { cleanupIDs: false },
                    { unknownAttrs: false },
                    { unknownContent: false },
                    { defaultAttrs: false },
                    { removeTitle: true },
                    { removeDesc: true },
                    { removeDoctype: true }
                ]
            })
        )
        .pipe(svgstore({ inlineSvg: true }))
        .pipe(gulp.dest(svgDest))
        .pipe(config.production ? utility.noop() : browserSync.stream())
        .on("end", function() {
            fs.renameSync(svgDest + "/svg.svg", svgDest + "/sprite.svg")
        })
})

/*========================================
=            Standalone Tasks            =
========================================*/
// Optimize images
gulp.task("img-opt", function() {
    return gulp
        .src(imgPathWatch)
        .pipe(
            imagemin({
                progressive: true
            })
        )
        .pipe(gulp.dest(imgDest))
})

// Browser Sync
gulp.task("serve", ["stylesheets", "scripts", "svgs"], functiofn() {
    var files = [stylePathWatch, scriptsPathWatch, phpPath]

    browserSync.init(files, {
        proxy: settings.devUrl
    })

    gulp.watch(stylePathWatch, ["stylesheets"])
    gulp.watch(scriptsPathWatch, ["scripts"])
    gulp.watch(scriptsPathWatch, ["svgs"])
    gulp.watch(phpPath).on("change", browserSync.reload)
})

/*===================================
=            Watch Tasks            =
===================================*/
gulp.task("watch-images", function() {
    gulp.watch(imgPathWatch, ["img-opt"])
})

/*==========================================
=            Run the Gulp Tasks            =
==========================================*/
gulp.task("default", [
    "stylesheets",
    "scripts",
    "svgs",
    "watch-images",
    "serve"
])
gulp.task("build", ["stylesheets", "scripts", "svgs"])
gulp.task("images", ["img-opt"])
