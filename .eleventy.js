module.exports = function(eleventyConfig) {
    eleventyConfig.addPassthroughCopy("./src/css/");
    eleventyConfig.addWatchTarget("./src/css/");

    eleventyConfig.addPassthroughCopy("./src/fonts/");
    eleventyConfig.addWatchTarget("./src/fonts/");

    eleventyConfig.addPassthroughCopy("./src/js/");
    eleventyConfig.addWatchTarget("./src/js/");

    eleventyConfig.addPassthroughCopy("./src/audio/");
    eleventyConfig.addWatchTarget("./src/audio/");

    eleventyConfig.addPassthroughCopy("./src/images/");
    eleventyConfig.addWatchTarget("./src/imgages/");


    return {
        dir: {
            input: "src",
            output: "public",

        },
    };
};