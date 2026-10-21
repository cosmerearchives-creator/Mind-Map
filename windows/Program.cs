using System;
using System.Windows.Forms;

namespace Silverlight.Windows;

internal static class Program
{
    [STAThread]
    static void Main()
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new MainWindow());
    }
}
