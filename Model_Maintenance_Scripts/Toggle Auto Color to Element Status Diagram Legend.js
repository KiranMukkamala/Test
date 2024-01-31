!INC Local Scripts.EAConstants-JavaScript

/*
 * This code has been included from the default Diagram Script template.
 * If you wish to modify this template, it is located in the Config\Script Templates
 * directory of your EA install path.
 *
 * Script Name: Toggle Auto Color to Element Status Diagram Legend
 * Author: Kiran Mukkamala
 * Purpose: To Toggle Auto Color to Element Status diagram legend for all diagrams
 * Date: 26.10.2023
 */

/*
 * Diagram Script main function
 */
function OnDiagramScript()
{
	//Session.Output(Repository.SecurityUser.Login);
	// Get a reference to the current diagram
	var currentDiagram as EA.Diagram;
	currentDiagram = Repository.GetCurrentDiagram();

	if((this.Session.UserName != "MUK3SH") && (this.Session.UserName != "muk3sh") && (this.Session.UserName != "FAM1RT") && (this.Session.UserName != "fam1rt"))
	{
		Session.Output(" <======== Only Authorised users can run the Toggle Auto Color to Element Status Diagram Legend script ========> ");
		return;
	}
	
	if ( currentDiagram != null )
	{
		Session.Output(" <======== Starting Toggle Auto Color to Element Status Diagram Legend script ========> ");
	
		var Diaglegend as EA.Element;

		// Change the GUID in case of new legend created in 'Lx - Cross-Level/OneParking Legends/Element Status'
		Diaglegend = Repository.GetElementByGuid("{35DB2B88-241A-4e7e-9A08-0666AA51D10B}");
		
		var thePackage as EA.Package;
		thePackage = Repository.GetPackageByGuid("{749594B2-6E22-44fa-9D11-7574AE134E31}");
		
		var ElementList as EA.Collection;
		ElementList = thePackage.Elements;
	   //Session.Output("Package selected is:: " + thePackage.Name + " No.of SubPackages in Package selected is :: " + thePackage.Packages.Count + " No.of Elements in Package selected is :: " + ElementList.Count);
		
		//Apply user lock for entire package
		thePackage.ApplyUserLockRecursive(true, true, true);
		
		//Check for Element Status Diagram Legend in the legends package
		var ele as EA.Element;
	  
		for (var e=0; e< ElementList.Count;e++)
		{
			ele = ElementList.GetAt(e);
			
			if(ele.ElementGUID == "{35DB2B88-241A-4e7e-9A08-0666AA51D10B}")
			{
				//Session.Output(ele.StyleEx);
				const expr = ele.StyleEx;
				if (expr.search("LegendOpts=31") != -1)
				{
					ele.StyleEx = expr.replace("LegendOpts=31","LegendOpts=63");
					Session.Output(" <======== Auto Color Applied for Element Status Diagram Legend, reload the diagrams if necessary========> ");
				}
				else
				{
					ele.StyleEx = expr.replace("LegendOpts=63","LegendOpts=31");
					Session.Output(" <======== Auto Color Removed for Element Status Diagram Legend, reload the diagrams if necessary========> ");
				}
				//Session.Output(ele.StyleEx);
				ele.Update();
				
			}
		}
		
		//Release the user lock
		//thePackage.ReleaseUserLockRecursive(true, true, true);
		
		Repository.RefreshOpenDiagrams(true);
		//currentDiagram.DiagramID
		
		Session.Output(" <======== Toggle Auto Color to Element Status Diagram Legend script ended========> ");
	}
	else
	{
		Session.Prompt( "This script requires a diagram to be visible.", promptOK)
	}
}

OnDiagramScript();
