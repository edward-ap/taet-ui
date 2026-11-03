using System.Text.Json;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using System.Windows.Forms;

// Temporary native test host. Never opens or changes a consumer application's data.
internal sealed class Probe : Form {
    protected override bool ShowWithoutActivation => true;
    readonly WebView2 view = new() { Dock = DockStyle.Fill };
    readonly string root, report, profile;
    public Probe(string[] args) {
        root = args[0]; report = args[1]; profile = args[2];
        ClientSize = new System.Drawing.Size(1440, 900);
        ShowInTaskbar = false; Opacity = 0; Controls.Add(view);
        Shown += async (_, _) => {
            try { await Run(); Environment.ExitCode = 0; }
            catch(Exception e) { File.WriteAllText(report, JsonSerializer.Serialize(new { error=e.ToString() })); Environment.ExitCode = 1; }
            finally { view.Dispose(); Close(); }
        };
    }
    async Task Run() {
        var environment = await CoreWebView2Environment.CreateAsync(null, profile,
            new CoreWebView2EnvironmentOptions("--disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows"));
        await view.EnsureCoreWebView2Async(environment);
        var core = view.CoreWebView2;
        core.SetVirtualHostNameToFolderMapping("taet-ui.test", root, CoreWebView2HostResourceAccessKind.DenyCors);
        var blocked = new List<string>();
        core.AddWebResourceRequestedFilter("*", CoreWebView2WebResourceContext.All);
        core.WebResourceRequested += (_, e) => {
            var uri = new Uri(e.Request.Uri);
            if(uri.Scheme == "data" || uri.Scheme == "blob") return;
            if(uri.Host == "taet-ui.test" && (uri.AbsolutePath.StartsWith("/dist/") || uri.AbsolutePath == "/browser-tests/bundle.html" || uri.AbsolutePath == "/browser-tests/bundle-fixture.js")) return;
            blocked.Add(e.Request.Uri);
            e.Response = environment.CreateWebResourceResponse(new MemoryStream(),403,"Blocked by bundle probe","");
        };
        var cases = new List<JsonElement>();
        foreach(var kind in new[]{"full","reader"}) foreach(var min in new[]{"0","1"}) {
            var navigation = new TaskCompletionSource<bool>();
            EventHandler<CoreWebView2NavigationCompletedEventArgs> handler = (_, e) => navigation.TrySetResult(e.IsSuccess);
            core.NavigationCompleted += handler;
            try {
                core.Navigate($"https://taet-ui.test/browser-tests/bundle.html?profile={kind}&min={min}&autorun=1");
                if(!await navigation.Task.WaitAsync(TimeSpan.FromSeconds(30))) throw new Exception("Navigation failed");
            } finally { core.NavigationCompleted -= handler; }
            bool completed = false;
            for(int attempt=0;attempt<300;attempt++) {
                using var json = JsonDocument.Parse(await core.ExecuteScriptAsync("({result:window.bundleResult??null,error:window.bundleError??null})"));
                var error = json.RootElement.GetProperty("error");
                if(error.ValueKind != JsonValueKind.Null) throw new Exception(error.GetString());
                var result = json.RootElement.GetProperty("result");
                if(result.ValueKind != JsonValueKind.Null) { cases.Add(result.Clone()); completed=true; break; }
                await Task.Delay(100);
            }
            if(!completed) throw new Exception($"Timed out: {kind}/{min}");
        }
        if(blocked.Count != 0) throw new Exception("Unexpected asset requests: " + string.Join(", ",blocked));
        File.WriteAllText(report,JsonSerializer.Serialize(new { runtime=environment.BrowserVersionString,origin="https://taet-ui.test",cases,blocked },new JsonSerializerOptions{WriteIndented=true}));
    }
    [STAThread] static void Main(string[] args) {
        Application.EnableVisualStyles(); Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new Probe(args));
    }
}
